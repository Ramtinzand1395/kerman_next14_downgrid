// app/api/payment-wallet/route.ts
// POST: پرداخت سفارش با موجودی کیف پول (باشگاه مشتریان)
//
// جریان: اعتبارسنجی آدرس/اقلام/قیمت از دیتابیس → کوپن → ساخت سفارش unpaid →
//        برداشت اتمیک از کیف پول → کسر موجودی انبار → علامت paid →
//        اعمال قطعی کوپن + هوک‌های باشگاه مشتریان.
// اگر برداشت یا کسر انبار شکست بخورد، سفارش حذف/لغو و مبلغ برمی‌گردد.
import dbConnect from "@/lib/mongodb";
import Address from "@/model/Address";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Product from "@/model/Product";
import User from "@/model/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { debit, credit } from "@/lib/loyalty/wallet.service";
import { validateCoupon, applyCoupon } from "@/lib/loyalty/coupon.service";
import { onSuccessfulPurchase } from "@/lib/loyalty/purchase.hooks";

interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  const idempotencyKey = req.headers.get("Idempotency-Key")?.trim() || null;

  try {
    const payload: {
      addressId?: string;
      items?: CheckoutItem[];
      shippingCost?: number;
      couponCode?: string;
    } = await req.json();

    if (
      !payload.addressId ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "درخواست سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(payload.addressId)) {
      return NextResponse.json(
        { success: false, error: "شناسه آدرس معتبر نیست." },
        { status: 400 },
      );
    }

    const address = await Address.findOne({
      _id: payload.addressId,
      userId,
    }).lean();
    if (!address) {
      return NextResponse.json(
        { success: false, error: "آدرس انتخابی معتبر نیست." },
        { status: 400 },
      );
    }

    const normalizedItems = payload.items
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        variantId: item.variantId,
      }))
      .filter(
        (item) =>
          mongoose.isValidObjectId(item.productId) &&
          (!item.variantId || mongoose.isValidObjectId(item.variantId)) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );

    if (normalizedItems.length !== payload.items.length) {
      return NextResponse.json(
        { success: false, error: "اطلاعات اقلام سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("price discountPrice stock productType variants category")
      .lean();

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: "برخی از محصولات نامعتبر هستند." },
        { status: 400 },
      );
    }

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const checkoutItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const hasVariants =
        product.productType === "multi" && Array.isArray(product.variants);

      if (hasVariants) {
        const selectedVariant = product.variants?.find(
          (variant: any) => String(variant._id) === String(item.variantId),
        );
        if (!selectedVariant) throw new Error("INVALID_VARIANT");
        if (Number(selectedVariant.stock || 0) < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }
        const unitPrice =
          selectedVariant.discountPrice ?? selectedVariant.price;
        return {
          product: item.productId,
          variantId: selectedVariant._id,
          variantTitle: selectedVariant.title,
          price: Number(selectedVariant.price || 0),
          discountPrice:
            selectedVariant.discountPrice === null ||
            selectedVariant.discountPrice === undefined
              ? null
              : Number(selectedVariant.discountPrice),
          quantity: item.quantity,
          total: Number(unitPrice || 0) * item.quantity,
        };
      }

      if ((product.stock ?? 0) < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }
      const unitPrice = product.discountPrice ?? product.price;
      return {
        product: item.productId,
        price: Number(product.price || 0),
        discountPrice:
          product.discountPrice === null || product.discountPrice === undefined
            ? null
            : Number(product.discountPrice),
        quantity: item.quantity,
        total: Number(unitPrice || 0) * item.quantity,
      };
    });

    const shippingCost = Number(payload.shippingCost ?? 0);
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      return NextResponse.json(
        { success: false, error: "هزینه ارسال نامعتبر است." },
        { status: 400 },
      );
    }

    const totalPrice = checkoutItems.reduce((acc, item) => acc + item.total, 0);

    // ── کوپن تخفیف ──
    let couponCode: string | null = null;
    let couponDiscount = 0;
    const rawCoupon = payload.couponCode?.trim();
    if (rawCoupon) {
      const validation = await validateCoupon({
        code: rawCoupon,
        userId,
        orderAmount: totalPrice,
        items: normalizedItems.map((item) => ({
          productId: item.productId,
          categoryIds: productMap.get(item.productId)?.category
            ? [String(productMap.get(item.productId)!.category)]
            : [],
        })),
      });
      if (!validation.ok) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 },
        );
      }
      couponCode = validation.coupon!.code;
      couponDiscount = validation.discountAmount!;
    }

    const finalPrice = totalPrice - couponDiscount + shippingCost;

    // ── ری‌پلی idempotent: اگر همین کلید قبلاً سفارش ساخته، همان را برگردان ──
    if (idempotencyKey) {
      const existing = await Order.findOne({
        user: userId,
        clientRequestKey: idempotencyKey,
      }).lean();
      if (existing) {
        return NextResponse.json({
          success: true,
          orderId: existing._id.toString(),
          reused: true,
        });
      }
    }

    // ── ساخت سفارش unpaid ──
    let order;
    try {
      order = await Order.create({
        user: userId,
        address: payload.addressId,
        items: checkoutItems,
        totalPrice,
        shippingCost,
        finalPrice,
        couponCode,
        couponDiscount,
        paymentStatus: "unpaid",
        paymentGateway: "wallet",
        clientRequestKey: idempotencyKey,
      });
    } catch (err) {
      // برخورد با کلید تکراری در حالت رقابتی — سفارش موجود را برگردان
      if ((err as { code?: number })?.code === 11000 && idempotencyKey) {
        const existing = await Order.findOne({
          user: userId,
          clientRequestKey: idempotencyKey,
        }).lean();
        if (existing) {
          return NextResponse.json({
            success: true,
            orderId: existing._id.toString(),
            reused: true,
          });
        }
      }
      throw err;
    }

    const orderId = order._id.toString();

    // ── برداشت از کیف پول (اتمیک، ضد double-spend) ──
    if (finalPrice > 0) {
      const debitResult = await debit({
        userId,
        amount: finalPrice,
        type: "payment",
        idempotencyKey: `wallet-pay:${orderId}`,
        ref: { kind: "Order", item: order._id },
        description: `پرداخت سفارش از کیف پول`,
      });

      if (!debitResult.ok) {
        await Order.deleteOne({ _id: order._id, paymentStatus: "unpaid" });
        return NextResponse.json(
          {
            success: false,
            error: debitResult.error || "موجودی کیف پول کافی نیست",
            balance: debitResult.balance,
          },
          { status: 402 },
        );
      }
    }

    // ── کسر موجودی انبار — در صورت کمبود، وجه برمی‌گردد ──
    for (const item of checkoutItems) {
      const updated = item.variantId
        ? await Product.findOneAndUpdate(
            {
              _id: item.product,
              stock: { $gte: item.quantity },
              variants: {
                $elemMatch: {
                  _id: item.variantId,
                  stock: { $gte: item.quantity },
                },
              },
            },
            {
              $inc: {
                stock: -item.quantity,
                "variants.$.stock": -item.quantity,
              },
            },
          )
        : await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
          );

      if (!updated) {
        // برگشت وجه + لغو سفارش
        if (finalPrice > 0) {
          await credit({
            userId,
            amount: finalPrice,
            type: "refund",
            idempotencyKey: `refund:${orderId}`,
            ref: { kind: "Order", item: order._id },
            description: "بازگشت وجه — موجودی کافی نبود",
          });
        }
        await Order.findByIdAndUpdate(order._id, {
          status: "cancelled",
          paymentStatus: "failed",
        });
        return NextResponse.json(
          { success: false, error: "موجودی برخی محصولات کافی نیست." },
          { status: 409 },
        );
      }
    }

    // ── نهایی‌سازی پرداخت ──
    await Order.findByIdAndUpdate(order._id, {
      paymentStatus: "paid",
      paymentVerifiedAt: new Date(),
    });

    await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

    await Notification.create({
      title: "سفارش جدید",
      message: "یک سفارش جدید ثبت شد",
      type: "order",
      target: { kind: "Order", item: order._id },
    });

    // ── باشگاه مشتریان: اعمال قطعی کوپن + XP/کش‌بک/VIP/ماموریت/نشان/رفرال ──
    try {
      const categoryOf = new Map(
        products.map((p) => [String(p._id), String(p.category)]),
      );
      const categoryIds = [...new Set(categoryOf.values())];

      if (couponCode) {
        const applied = await applyCoupon({
          code: couponCode,
          userId,
          orderId,
          orderAmount: totalPrice,
          items: normalizedItems.map((item) => ({
            productId: item.productId,
            categoryIds: categoryOf.has(item.productId)
              ? [categoryOf.get(item.productId)!]
              : [],
          })),
        });
        if (!applied.ok) {
          console.error(
            `[loyalty] applyCoupon failed for wallet order ${orderId}:`,
            applied.error,
          );
        }
      }

      await onSuccessfulPurchase({
        userId,
        orderId,
        orderAmount: finalPrice,
        categoryIds,
      });
    } catch (err) {
      console.error("[loyalty] wallet-payment hooks failed:", err);
    }

    console.info(
      JSON.stringify({
        event: "payment.wallet.completed",
        orderId,
        userId,
        finalPrice,
      }),
    );

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { success: false, error: "موجودی برخی محصولات کافی نیست." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "INVALID_VARIANT") {
      return NextResponse.json(
        { success: false, error: "مدل انتخابی برای محصول معتبر نیست." },
        { status: 400 },
      );
    }
    console.error("[payment-wallet] error:", error);
    const message = error instanceof Error ? error.message : "خطا در سرور";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
