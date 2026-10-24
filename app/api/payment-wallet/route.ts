// app/api/payment-wallet/route.ts
// POST: پرداخت سفارش با موجودی کیف پول (باشگاه مشتریان)
//
// جریان: اعتبارسنجی آدرس/اقلام/قیمت از دیتابیس → کوپن → ساخت سفارش unpaid →
//        برداشت اتمیک از کیف پول → کسر موجودی انبار → علامت paid →
//        اعمال قطعی کوپن + هوک‌های باشگاه مشتریان.
// اگر برداشت یا کسر انبار شکست بخورد، سفارش حذف/لغو و مبلغ برمی‌گردد.
import dbConnect from "@/lib/mongodb";
import Address from "@/model/Address";
import Order from "@/model/Order";
import Product from "@/model/Product";
import User from "@/model/User";
import WalletPaymentAttempt from "@/model/WalletPaymentAttempt";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { createAddressSnapshot } from "@/lib/addressSnapshot";
import { createStoreIdentitySnapshot } from "@/lib/storeIdentity";
import {
  buildOrderIdentifiers,
  ensurePaidOrderIdentifiers,
} from "@/lib/orderIdentifiers";
import { NextRequest, NextResponse } from "next/server";
import { debit, credit } from "@/lib/loyalty/wallet.service";
import { validateCoupon, applyCoupon } from "@/lib/loyalty/coupon.service";
import { onSuccessfulPurchase } from "@/lib/loyalty/purchase.hooks";
import { notifyInventoryFailure, notifyLowInventory, notifyOrderPaid, notifyPaymentFailed } from "@/lib/notifications/events";
import {
  calculateShippingInfo,
  createOrderShippingSnapshot,
  InvalidShippingDestinationError,
  ShippingMethodUnavailableError,
  type ShippingMethod,
} from "@/lib/shipping";
import { getStoreShippingSettings } from "@/lib/shippingSettings";
import {
  getVariantAttributeSelections,
  isVariantMappedForSale,
} from "@/lib/variantSelector";

interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

const AUTOMATIC_IDEMPOTENCY_TTL_MS = 5 * 60_000;
const AUTOMATIC_IDEMPOTENCY_WAIT_MS = 5_000;
const AUTOMATIC_IDEMPOTENCY_POLL_MS = 100;

function automaticIdempotencyFingerprint(input: {
  userId: string;
  addressId: string;
  items: CheckoutItem[];
  shippingCost: number | null;
  couponCode: string | null;
}) {
  const canonicalItems = input.items
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
    }))
    .sort((left, right) =>
      `${left.productId}:${left.variantId ?? ""}`.localeCompare(
        `${right.productId}:${right.variantId ?? ""}`,
      ),
    );

  return createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        userId: input.userId,
        addressId: input.addressId,
        items: canonicalItems,
        shippingCost: input.shippingCost,
        couponCode: input.couponCode,
      }),
    )
    .digest("hex");
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retryLoyaltyForPaidOrder(orderId: string) {
  try {
    await ensurePaidOrderIdentifiers(orderId);
    await onSuccessfulPurchase({ orderId });
  } catch (error) {
    console.error(
      `[loyalty] wallet retry failed orderId=${orderId}`,
      error,
    );
  }
}

async function replayAutomaticAttempt(fingerprint: string) {
  const deadline = Date.now() + AUTOMATIC_IDEMPOTENCY_WAIT_MS;

  do {
    const existing = await WalletPaymentAttempt.findOne({ fingerprint }).lean();
    if (!existing) return null;

    if (existing.status === "completed" && existing.order) {
      await retryLoyaltyForPaidOrder(existing.order.toString());
      return NextResponse.json({
        success: true,
        orderId: existing.order.toString(),
        reused: true,
      });
    }

    if (existing.status === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: existing.error || "پرداخت قبلی ناموفق بود.",
          reused: true,
        },
        { status: existing.httpStatus || 409 },
      );
    }

    await delay(AUTOMATIC_IDEMPOTENCY_POLL_MS);
  } while (Date.now() < deadline);

  return NextResponse.json(
    {
      success: false,
      error: "این پرداخت در حال پردازش است.",
      reused: true,
      retryable: true,
    },
    { status: 409, headers: { "Retry-After": "1" } },
  );
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
  const idempotencyKey =
    req.headers.get("Idempotency-Key")?.trim() || undefined;
  let automaticAttemptId: mongoose.Types.ObjectId | undefined;

  try {
    const payload: {
      addressId?: string;
      items?: CheckoutItem[];
      couponCode?: string;
      shippingMethod?: ShippingMethod;
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

    const buyer = await User.findById(userId).select("username mobile").lean();
    if (!buyer) {
      return NextResponse.json(
        { success: false, error: "اطلاعات خریدار یافت نشد." },
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

    const uniqueProductIds = [
      ...new Set(normalizedItems.map((item) => item.productId)),
    ];
    const products = await Product.find({
      _id: { $in: uniqueProductIds },
      status: "published",
      deletedAt: null,
    })
      .select("title sku mainImage price discountPrice stock productType variants variantSelector category status deletedAt")
      .lean();

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        { success: false, error: "برخی از محصولات نامعتبر یا ناموجود هستند." },
        { status: 400 },
      );
    }

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const requestedQtyByVariant = new Map<string, number>();
    const requestedQtyByProduct = new Map<string, number>();
    for (const item of normalizedItems) {
      if (item.variantId) {
        const vKey = `${item.productId}:${item.variantId}`;
        requestedQtyByVariant.set(
          vKey,
          (requestedQtyByVariant.get(vKey) || 0) + item.quantity,
        );
      }
      requestedQtyByProduct.set(
        item.productId,
        (requestedQtyByProduct.get(item.productId) || 0) + item.quantity,
      );
    }

    const checkoutItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const hasVariants =
        product.productType === "multi" && Array.isArray(product.variants);

      if (hasVariants) {
        if (!item.variantId) {
          throw new Error("VARIANT_REQUIRED");
        }
        const selectedVariant = product.variants?.find(
          (variant: any) =>
            String(variant._id) === String(item.variantId) &&
            variant.isActive !== false,
        );
        if (!selectedVariant) throw new Error("INVALID_VARIANT");
        if (!isVariantMappedForSale(product.variantSelector as any, String(selectedVariant._id))) {
          throw new Error("INVALID_VARIANT");
        }

        const totalVariantQty =
          requestedQtyByVariant.get(`${item.productId}:${item.variantId}`) ||
          item.quantity;
        if (Number(selectedVariant.stock || 0) < totalVariantQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const totalProductQty =
          requestedQtyByProduct.get(item.productId) || item.quantity;
        if (Number(product.stock || 0) < totalProductQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const unitPrice =
          selectedVariant.discountPrice ?? selectedVariant.price;
        return {
          product: item.productId,
          productTitle: product.title,
          productImage: product.mainImage,
          productSku: product.sku || null,
          variantId: selectedVariant._id,
          variantTitle: selectedVariant.title,
          variantSku: selectedVariant.sku,
          variantAttributes: getVariantAttributeSelections(
            product.variantSelector as any,
            String(selectedVariant._id),
          ),
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

      if (product.productType === "multi") {
        throw new Error("VARIANT_REQUIRED");
      }

      const totalProductQty =
        requestedQtyByProduct.get(item.productId) || item.quantity;
      if (Number(product.stock ?? 0) < totalProductQty) {
        throw new Error("INSUFFICIENT_STOCK");
      }
      const unitPrice = product.discountPrice ?? product.price;
      return {
        product: item.productId,
        productTitle: product.title,
        productImage: product.mainImage,
        productSku: product.sku || null,
        price: Number(product.price || 0),
        discountPrice:
          product.discountPrice === null || product.discountPrice === undefined
            ? null
            : Number(product.discountPrice),
        quantity: item.quantity,
        total: Number(unitPrice || 0) * item.quantity,
      };
    });

    const addressSnapshot = createAddressSnapshot(address, {
      name: buyer.username,
      mobile: buyer.mobile,
    });
    const shippingSettings = await getStoreShippingSettings();
    const shippingInfo = calculateShippingInfo({
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      address: address.address,
    }, payload.shippingMethod, shippingSettings);
    const shippingCost = shippingInfo.feeToman;
    const shippingPaymentType = shippingInfo.paymentType;
    const shipping = createOrderShippingSnapshot(shippingInfo, addressSnapshot);

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
        items: normalizedItems.map((item, index) => ({
          productId: item.productId,
          amount: checkoutItems[index].total,
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

    const finalPrice = totalPrice - couponDiscount + (shippingCost ?? 0);

    // If the caller omitted Idempotency-Key, atomically claim a short-lived
    // fingerprint of the checkout. This closes the double-click race without
    // preventing an intentional identical purchase at a later time.
    if (!idempotencyKey) {
      // Model operations do not necessarily wait for background index creation.
      // Waiting for init here guarantees the unique lock exists before checkout.
      await WalletPaymentAttempt.init();

      const fingerprint = automaticIdempotencyFingerprint({
        userId,
        addressId: payload.addressId,
        items: normalizedItems,
        shippingCost,
        couponCode,
      });

      for (let attempt = 0; attempt < 2 && !automaticAttemptId; attempt++) {
        try {
          const claim = await WalletPaymentAttempt.create({
            fingerprint,
            user: userId,
            status: "processing",
            expiresAt: new Date(Date.now() + AUTOMATIC_IDEMPOTENCY_TTL_MS),
          });
          automaticAttemptId = claim._id;
        } catch (error) {
          if ((error as { code?: number })?.code !== 11000) throw error;

          const existing = await WalletPaymentAttempt.findOne({ fingerprint })
            .select("expiresAt")
            .lean();
          if (existing && existing.expiresAt <= new Date()) {
            await WalletPaymentAttempt.deleteOne({
              _id: existing._id,
              expiresAt: { $lte: new Date() },
            });
            continue;
          }

          return (
            (await replayAutomaticAttempt(fingerprint)) ??
            NextResponse.json(
              {
                success: false,
                error: "این پرداخت در حال پردازش است؛ دوباره تلاش کنید.",
                retryable: true,
              },
              { status: 409, headers: { "Retry-After": "1" } },
            )
          );
        }
      }
    }

    // ── ری‌پلی idempotent: اگر همین کلید قبلاً سفارش ساخته، همان را برگردان ──
    if (idempotencyKey) {
      const existing = await Order.findOne({
        user: userId,
        clientRequestKey: idempotencyKey,
      }).lean();
      if (existing) {
        if (existing.paymentStatus === "paid") {
          await retryLoyaltyForPaidOrder(existing._id.toString());
        }
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
        addressSnapshot,
        buyerSnapshot: {
          name: String(buyer.username || "کاربر"),
          mobile: String(buyer.mobile || ""),
        },
        sellerSnapshot: createStoreIdentitySnapshot(),
        items: checkoutItems,
        totalPrice,
        shippingCost,
        shippingPaymentType,
        shipping,
        finalPrice,
        couponCode,
        couponDiscount,
        paymentStatus: "unpaid",
        paymentGateway: "wallet",
        ...(idempotencyKey ? { clientRequestKey: idempotencyKey } : {}),
      });
    } catch (err) {
      // برخورد با کلید تکراری در حالت رقابتی — سفارش موجود را برگردان
      if ((err as { code?: number })?.code === 11000 && idempotencyKey) {
        const existing = await Order.findOne({
          user: userId,
          clientRequestKey: idempotencyKey,
        }).lean();
        if (existing) {
          if (existing.paymentStatus === "paid") {
            await retryLoyaltyForPaidOrder(existing._id.toString());
          }
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

    if (automaticAttemptId) {
      await WalletPaymentAttempt.updateOne(
        { _id: automaticAttemptId, status: "processing" },
        { $set: { order: order._id } },
      );
    }

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
        if (automaticAttemptId) {
          await WalletPaymentAttempt.updateOne(
            { _id: automaticAttemptId, status: "processing" },
            {
              $set: {
                status: "failed",
                error: debitResult.error || "موجودی کیف پول کافی نیست",
                httpStatus: 402,
              },
              $unset: { order: "" },
            },
          );
        }
        await notifyPaymentFailed({
          userId,
          paymentId: automaticAttemptId?.toString() || orderId,
          message: debitResult.error || "پرداخت از کیف پول انجام نشد.",
        }).catch(() => undefined);
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
    const decrementedItems: typeof checkoutItems = [];
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
                  isActive: { $ne: false },
                },
              },
            },
            {
              $inc: {
                stock: -item.quantity,
                "variants.$.stock": -item.quantity,
                inventoryVersion: 1,
              },
            },
          )
        : await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, inventoryVersion: 1 } },
          );

      if (!updated) {
        await notifyInventoryFailure({ productId: item.product, eventId: orderId }).catch(() => undefined);
        for (const previous of decrementedItems) {
          await Product.findOneAndUpdate(
            previous.variantId
              ? { _id: previous.product, variants: { $elemMatch: { _id: previous.variantId } } }
              : { _id: previous.product },
            previous.variantId
              ? {
                  $inc: {
                    stock: previous.quantity,
                    "variants.$.stock": previous.quantity,
                    inventoryVersion: 1,
                  },
                }
              : { $inc: { stock: previous.quantity, inventoryVersion: 1 } },
          );
        }
        // برگشت وجه + لغو سفارش
        if (finalPrice > 0) {
          await credit({
            userId,
            amount: finalPrice,
            type: "refund",
            idempotencyKey: `refund:${orderId}`,
            ref: { kind: "Order", item: order._id },
            description: "بازگشت وجه — موجودی کافی نبود",
            notify: {
              title: "بازگشت وجه به کیف پول",
              message: `مبلغ ${finalPrice.toLocaleString("fa-IR")} تومان به‌دلیل کمبود موجودی به کیف پول شما بازگردانده شد.`,
            },
          });
        }
        await Order.findByIdAndUpdate(order._id, {
          status: "cancelled",
          paymentStatus: "failed",
        });
        if (automaticAttemptId) {
          await WalletPaymentAttempt.updateOne(
            { _id: automaticAttemptId, status: "processing" },
            {
              $set: {
                status: "failed",
                error: "موجودی برخی محصولات کافی نیست.",
                httpStatus: 409,
              },
            },
          );
        }
        return NextResponse.json(
          { success: false, error: "موجودی برخی محصولات کافی نیست." },
          { status: 409 },
        );
      }
      decrementedItems.push(item);
    }

    // ── نهایی‌سازی پرداخت ──
    const identifiers = buildOrderIdentifiers(order._id);
    await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "unpaid" },
      {
        $set: {
          paymentStatus: "paid",
          paymentVerifiedAt: new Date(),
          ...identifiers,
        },
      },
    );

    if (automaticAttemptId) {
      await WalletPaymentAttempt.updateOne(
        { _id: automaticAttemptId, status: "processing" },
        { $set: { status: "completed", order: order._id } },
      );
    }

    await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

    await Promise.all([
      notifyOrderPaid({
        orderId: order._id,
        userId,
        amount: Number(order.finalPrice),
        gateway: "wallet",
      }),
      notifyLowInventory(decrementedItems.map((item) => item.product)),
    ]).catch((error) => console.error("[notifications] wallet order event failed:", error));

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
          items: normalizedItems.map((item, index) => ({
            productId: item.productId,
            amount: checkoutItems[index].total,
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
    if (automaticAttemptId) {
      await WalletPaymentAttempt.updateOne(
        { _id: automaticAttemptId, status: "processing" },
        {
          $set: {
            status: "failed",
            error: "پرداخت کیف پول تکمیل نشد؛ مبلغی کسر نشده است.",
            httpStatus: 500,
          },
        },
      ).catch(() => {});
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { success: false, error: "موجودی برخی محصولات کافی نیست." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "VARIANT_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "انتخاب مدل برای محصول چندمدلی الزامی است." },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "INVALID_VARIANT") {
      return NextResponse.json(
        { success: false, error: "مدل انتخابی برای محصول معتبر یا فعال نیست." },
        { status: 400 },
      );
    }
    if (
      error instanceof InvalidShippingDestinationError ||
      error instanceof ShippingMethodUnavailableError
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("[payment-wallet] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "پرداخت کیف پول تکمیل نشد؛ دوباره تلاش کنید.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
