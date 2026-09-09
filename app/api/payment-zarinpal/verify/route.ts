
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import User from "@/model/User";
import Wallet from "@/model/Loyalty Club/Wallet";
import WalletTransaction from "@/model/Loyalty Club/WalletTransaction";
import { onSuccessfulPurchase } from "@/lib/loyalty/purchase.hooks";
import { applyCoupon, releaseCoupon } from "@/lib/loyalty/coupon.service";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/baseUrl";
import mongoose from "mongoose";

type ZarinpalVerifyResponse = {
  data?: {
    code?: number;
    ref_id?: number;
    card_pan?: string;
    fee_type?: string;
    fee?: number;
  };
};

const PAYMENT_PROCESSING_TTL_MS = 15 * 60 * 1000;

type InventoryItem = {
  product: string;
  variantId?: string;
  quantity: number;
};

async function restoreInventory(items: InventoryItem[]) {
  for (const item of items) {
    await Product.findOneAndUpdate(
      item.variantId
        ? {
            _id: item.product,
            variants: { $elemMatch: { _id: item.variantId } },
          }
        : { _id: item.product },
      item.variantId
        ? {
            $inc: {
              stock: item.quantity,
              "variants.$.stock": item.quantity,
            },
          }
        : { $inc: { stock: item.quantity } },
    );
  }
}

function withPaymentQuery(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function GET(req: NextRequest) {
  await dbConnect();

  const baseUrl = getSiteUrl();
  const { searchParams } = new URL(req.url);

  const authority =
    searchParams.get("Authority") ?? searchParams.get("authority") ?? "";
  const status = searchParams.get("Status") ?? searchParams.get("status") ?? "";
  const retried = searchParams.get("retried") ?? "";

  const failedUrl = withPaymentQuery(baseUrl, "/payment-failed", {
    authority,
    status,
    retried: retried === "1" ? "1" : undefined,
  });

  const pendingUrl = withPaymentQuery(baseUrl, "/payment-pending", {
    authority,
  });

  try {
    if (!authority || status !== "OK") {
      if (authority) {
        await TempPayment.findOneAndUpdate(
          { authority, status: "initiated" },
          { $set: { status: "failed", failedAt: new Date() } },
        );
      }
      return NextResponse.redirect(failedUrl);
    }

    const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant_id) return NextResponse.redirect(failedUrl);

    const alreadyPaidOrder = await Order.findOne({
      paymentAuthority: authority,
      paymentStatus: { $in: ["paid", "pending_refund"] },
    }).lean();

    if (alreadyPaidOrder) {
      const successPath =
        alreadyPaidOrder.paymentStatus === "pending_refund"
          ? "/payment-pending"
          : "/payment-success";

      await TempPayment.deleteOne({ authority });

      const successUrl = withPaymentQuery(baseUrl, successPath, {
        orderId: alreadyPaidOrder._id?.toString(),
        authority,
        refId: alreadyPaidOrder.paymentRefId,
      });

      return NextResponse.redirect(successUrl);
    }

    const temp = await TempPayment.findOne({ authority }).lean();
    if (!temp) return NextResponse.redirect(failedUrl);

    const verifyRes = await fetch(
      "https://payment.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount: temp.gatewayAmount,
          authority,
        }),
        cache: "no-store",
      },
    );

    const result = (await verifyRes.json()) as ZarinpalVerifyResponse;
    const code = result?.data?.code;

    if (!verifyRes.ok || (code !== 100 && code !== 101)) {
      await TempPayment.findOneAndUpdate(
        { authority, status: "initiated" },
        { $set: { status: "failed", failedAt: new Date() } },
      );
      return NextResponse.redirect(failedUrl);
    }

    const duplicateOrder = await Order.findOne({
      paymentAuthority: authority,
      paymentStatus: { $in: ["paid", "pending_refund"] },
    }).lean();

    if (duplicateOrder) {
      await TempPayment.deleteOne({ authority });

      const successPath =
        duplicateOrder.paymentStatus === "pending_refund"
          ? "/payment-pending"
          : "/payment-success";

      const duplicateUrl = withPaymentQuery(baseUrl, successPath, {
        orderId: duplicateOrder._id.toString(),
        authority,
        refId: duplicateOrder.paymentRefId,
      });

      return NextResponse.redirect(duplicateUrl);
    }

    // Claim the payment before performing any side effects. Only one callback
    // can atomically change initiated -> paid_pending, so concurrent callbacks
    // cannot decrement inventory or create the order a second time.
    const claimedTemp = await TempPayment.findOneAndUpdate(
      { authority, status: "initiated" },
      {
        $set: {
          status: "paid_pending",
          failedAt: null,
          expiresAt: new Date(Date.now() + PAYMENT_PROCESSING_TTL_MS),
        },
      },
      { returnDocument: "after" },
    ).lean();

    if (!claimedTemp) {
      // The winning callback may have completed between the earlier duplicate
      // check and this failed claim.
      const completedOrder = await Order.findOne({
        paymentAuthority: authority,
        paymentStatus: { $in: ["paid", "pending_refund"] },
      }).lean();

      if (completedOrder) {
        const completedPath =
          completedOrder.paymentStatus === "pending_refund"
            ? "/payment-pending"
            : "/payment-success";
        const completedUrl = withPaymentQuery(baseUrl, completedPath, {
          orderId: completedOrder._id.toString(),
          authority,
          refId: completedOrder.paymentRefId,
        });
        return NextResponse.redirect(completedUrl);
      }

      return NextResponse.redirect(pendingUrl);
    }

    // ── شارژ کیف پول ──
    // بدون این شاخه، کال‌بک شارژ کیف پول یک Order نامعتبر می‌ساخت.
    if (temp.purpose === "wallet_charge") {
      const chargedTx = temp.walletTransaction
        ? await WalletTransaction.findOneAndUpdate(
            { _id: temp.walletTransaction, status: "pending" },
            {
              $set: {
                status: "completed",
                "gateway.refId": result?.data?.ref_id ?? null,
              },
            },
            { returnDocument: "after" },
          )
        : null;

      if (chargedTx) {
        const updatedWallet = await Wallet.findOneAndUpdate(
          { user: temp.userId },
          { $inc: { balance: chargedTx.amount, version: 1 } },
          { returnDocument: "after" },
        );
        await WalletTransaction.updateOne(
          { _id: chargedTx._id },
          { $set: { balanceAfter: updatedWallet?.balance ?? null } },
        );

        await Notification.create({
          title: "شارژ کیف پول",
          message: `کیف پول شما مبلغ ${Number(chargedTx.amount).toLocaleString("fa-IR")} تومان شارژ شد.`,
          type: "wallet_credit",
          for: "user",
          user: temp.userId,
          target: { kind: "WalletTransaction", item: chargedTx._id },
        }).catch(() => {});
      }

      await TempPayment.deleteOne({ authority });

      const walletSuccessUrl = withPaymentQuery(baseUrl, "/payment-success", {
        wallet: "1",
        amount: chargedTx?.amount,
        refId: result?.data?.ref_id,
      });
      return NextResponse.redirect(walletSuccessUrl);
    }

    const decrementedItems: InventoryItem[] = [];

    for (const item of temp.items as Array<{
      product: string;
      variantId?: string;
      quantity: number;
    }>) {
      if (item.variantId) {
        const updated = await Product.findOneAndUpdate(
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
        );

        if (!updated) {
          await restoreInventory(decrementedItems);
          await TempPayment.findOneAndUpdate(
            { authority },
            { $set: { status: "failed", failedAt: new Date() } },
          );
          return NextResponse.redirect(failedUrl);
        }
        decrementedItems.push(item);
        continue;
      }

      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );

      if (!updated) {
        await restoreInventory(decrementedItems);
        await TempPayment.findOneAndUpdate(
          { authority },
          { $set: { status: "failed", failedAt: new Date() } },
        );
        return NextResponse.redirect(failedUrl);
      }
      decrementedItems.push(item);
    }

    const itemProducts = (temp.items as Array<{ product: unknown }>).map(
      (item) => String(item.product),
    );
    const productDocs = await Product.find({ _id: { $in: itemProducts } })
      .select("category")
      .lean();
    const categoryOf = new Map(
      productDocs.map((product) => [
        String(product._id),
        String(product.category),
      ]),
    );
    const categoryIds = [...new Set(categoryOf.values())];
    const couponItems = itemProducts.map((productId) => ({
      productId,
      categoryIds: categoryOf.has(productId)
        ? [categoryOf.get(productId)!]
        : [],
    }));
    const orderId = new mongoose.Types.ObjectId();

    // The amount has already been captured by the gateway, so coupon capacity
    // must be claimed before a paid order is created. A failed claim is routed
    // to refund handling instead of silently granting an invalid discount.
    if (temp.couponCode) {
      let applied;
      try {
        applied = await applyCoupon({
          code: temp.couponCode,
          userId: String(temp.userId),
          orderId: orderId.toString(),
          orderAmount: temp.totalPrice,
          items: couponItems,
        });
      } catch (error) {
        await restoreInventory(decrementedItems);
        await TempPayment.findOneAndUpdate(
          { authority, status: "paid_pending" },
          { $set: { status: "refund_required", expiresAt: null } },
        );
        console.error(
          `[loyalty] coupon claim errored for payment ${authority}:`,
          error,
        );
        return NextResponse.redirect(pendingUrl);
      }

      if (!applied.ok) {
        await restoreInventory(decrementedItems);
        await TempPayment.findOneAndUpdate(
          { authority, status: "paid_pending" },
          { $set: { status: "refund_required", expiresAt: null } },
        );
        console.error(
          `[loyalty] coupon claim failed for payment ${authority}:`,
          applied.error,
        );
        return NextResponse.redirect(pendingUrl);
      }
    }

    let order;
    try {
      order = await Order.create({
        _id: orderId,
        user: temp.userId,
        address: temp.address,
        addressSnapshot: temp.addressSnapshot,
        items: temp.items,
        totalPrice: temp.totalPrice,
        shippingCost: temp.shippingCost,
        finalPrice: temp.finalPrice,
        couponCode: temp.couponCode ?? null,
        couponDiscount: temp.couponDiscount ?? 0,
        paymentStatus: "paid",
        paymentGateway: "zarinpal",
        paymentAuthority: authority,
        paymentRefId: result?.data?.ref_id ?? null,
        paymentCardPan: result?.data?.card_pan ?? null,
        paymentFeeType: result?.data?.fee_type ?? null,
        paymentFee: result?.data?.fee ?? null,
        paymentVerifiedAt: new Date(),
      });
    } catch (error) {
      if (temp.couponCode) {
        await releaseCoupon(orderId.toString()).catch((releaseError) => {
          console.error(
            `[loyalty] failed to release coupon for order ${orderId}:`,
            releaseError,
          );
        });
      }
      await restoreInventory(decrementedItems);
      await TempPayment.findOneAndUpdate(
        { authority, status: "paid_pending" },
        { $set: { status: "refund_required", expiresAt: null } },
      );
      throw error;
    }

    await User.findByIdAndUpdate(temp.userId, { $push: { orders: order._id } });

    await Notification.create({
      title: "سفارش جدید",
      message: "یک سفارش جدید ثبت شد",
      type: "order",
      target: {
        kind: "Order",
        item: order._id,
      },
    });

    await TempPayment.deleteOne({ authority });

    // ── باشگاه مشتریان: XP/کش‌بک/VIP/ماموریت/نشان/رفرال ──
    // خطای این بخش‌ها سفارش پرداخت‌شده را برنمی‌گرداند ولی لاگ می‌شود.
    try {
      await onSuccessfulPurchase({
        userId: String(temp.userId),
        orderId: order._id.toString(),
        orderAmount: temp.finalPrice,
        categoryIds,
      });
    } catch (err) {
      console.error("[loyalty] post-payment hooks failed:", err);
    }

    const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
      orderId: order._id.toString(),
      authority,
      refId: result?.data?.ref_id,
    });

    console.info(
      JSON.stringify({
        event: "payment.verify.completed",
        authority,
        orderId: order._id.toString(),
      }),
    );

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(pendingUrl);
  }
}
