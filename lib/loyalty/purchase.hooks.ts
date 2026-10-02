// lib/loyalty/purchase.hooks.ts
// ارکستراتور رویدادهای باشگاه مشتریان پس از «پرداخت موفق سفارش»:
//   XP خرید (اولین/متوالی/معمولی) → کش‌بک → شمارنده‌های User → VIP →
//   ماموریت‌ها → نشان‌ها → رفرال
// همه مراحل idempotent‌اند؛ خطای هر مرحله فلو را نمی‌شکند ولی لاگ می‌شود.
import User from "@/model/User";
import Order from "@/model/Order";
import Product from "@/model/Product";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { grantXp, getSettings, syncVipTier } from "./experience.service";
import { grantCashback } from "./cashback.service";
import { trackEvent } from "./mission.service";
import { checkAchievements } from "./achievement.service";
import { rewardReferralOnFirstPurchase } from "./referral.service";

export interface PurchaseHookInput {
  userId?: string;
  orderId: string;
  /** مبلغ نهایی پرداخت‌شده سفارش (تومان) */
  orderAmount?: number;
  categoryIds?: string[];
}

const PURCHASE_LOCK_MS = 2 * 60_000;

export async function onSuccessfulPurchase(input: PurchaseHookInput): Promise<void> {
  const { orderId } = input;
  if (!mongoose.isValidObjectId(orderId)) {
    throw new Error("شناسه سفارش نامعتبر است");
  }

  const sourceOrder = await Order.findById(orderId)
    .select("user paymentStatus finalPrice items loyaltyProcessedAt")
    .lean();
  if (!sourceOrder || sourceOrder.paymentStatus !== "paid" || !sourceOrder.user) {
    throw new Error("سفارش پرداخت شده معتبر یافت نشد");
  }

  const userId = sourceOrder.user.toString();
  const orderAmount = Number(sourceOrder.finalPrice);
  if (!Number.isFinite(orderAmount) || orderAmount < 0) {
    throw new Error("مبلغ قطعی سفارش نامعتبر است");
  }
  if (input.userId && input.userId !== userId) {
    throw new Error("مالک سفارش با درخواست پردازش تطابق ندارد");
  }
  if (
    input.orderAmount !== undefined &&
    Number.isFinite(input.orderAmount) &&
    Number(input.orderAmount) !== orderAmount
  ) {
    throw new Error("مبلغ درخواست با مبلغ قطعی سفارش تطابق ندارد");
  }
  if (sourceOrder.loyaltyProcessedAt) return;

  const operationId = randomUUID();
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: "paid",
      $and: [
        {
          $or: [
            { loyaltyProcessedAt: null },
            { loyaltyProcessedAt: { $exists: false } },
          ],
        },
        {
          $or: [
            { loyaltyProcessingExpiresAt: null },
            { loyaltyProcessingExpiresAt: { $exists: false } },
            { loyaltyProcessingExpiresAt: { $lte: now } },
          ],
        },
      ],
    },
    {
      $set: {
        loyaltyProcessingToken: operationId,
        loyaltyProcessingStartedAt: now,
        loyaltyProcessingExpiresAt: new Date(now.getTime() + PURCHASE_LOCK_MS),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!order) return;

  let failed = false;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      failed = true;
      console.error(
        `[loyalty] purchase step failed operationId=${operationId} orderId=${orderId} step=${name}`,
        err,
      );
    }
  };

  try {
    const settings = await getSettings();
    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    // شمارنده و شناسه اولین سفارش در یک write اتمیک ثبت می شوند. وجود
    // loyaltyProcessedOrders باعث می شود retry و اجرای هم زمان دوباره inc نکنند.
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, loyaltyProcessedOrders: { $ne: orderObjectId } },
      [
        {
          $set: {
            firstSuccessfulOrder: {
              $cond: [
                { $eq: [{ $ifNull: ["$successfulOrders", 0] }, 0] },
                orderObjectId,
                "$firstSuccessfulOrder",
              ],
            },
            successfulOrders: {
              $add: [{ $ifNull: ["$successfulOrders", 0] }, 1],
            },
            totalPurchase: {
              $add: [{ $ifNull: ["$totalPurchase", 0] }, orderAmount],
            },
            loyaltyProcessedOrders: {
              $concatArrays: [
                { $ifNull: ["$loyaltyProcessedOrders", []] },
                [orderObjectId],
              ],
            },
          },
        },
      ],
      { returnDocument: "after" },
    ).lean();
    const user =
      updatedUser ??
      (await User.findById(userId)
        .select("firstSuccessfulOrder successfulOrders totalPurchase")
        .lean());
    if (!user) throw new Error("کاربر سفارش یافت نشد");

    const isFirstPurchase =
      user.firstSuccessfulOrder?.toString() === orderId;
    const itemProductIds = (
      order.items as Array<{ product?: mongoose.Types.ObjectId }>
    )
      .map((item) => item.product?.toString())
      .filter((item): item is string => Boolean(item));
    const productDocs = await Product.find({ _id: { $in: itemProductIds } })
      .select("category")
      .lean();
    const categoryIds = [
      ...new Set(
        productDocs
          .map((product) => product.category?.toString())
          .filter((category): category is string => Boolean(category)),
      ),
    ];

    await step("xp", async () => {
      if (isFirstPurchase && settings.xp.firstPurchase > 0) {
        const result = await grantXp({
          userId,
          amount: settings.xp.firstPurchase,
          reason: "first_purchase",
          idempotencyKey: `xp:first-purchase:${orderId}`,
          ref: { kind: "Order", item: orderId },
          description: "اولین خرید",
        });
        if (!result.ok) throw new Error(result.error ?? "خطا در XP خرید اول");
      }
      const base = Math.floor(orderAmount / 10_000) * settings.xp.purchasePer10k;
      if (base > 0) {
        const result = await grantXp({
          userId,
          amount: base,
          reason: "purchase",
          idempotencyKey: `xp:purchase:${orderId}`,
          ref: { kind: "Order", item: orderId },
          description: "خرید از فروشگاه",
        });
        if (!result.ok) throw new Error(result.error ?? "خطا در XP خرید");
      }
      if (!isFirstPurchase && settings.xp.consecutivePurchase > 0) {
        const result = await grantXp({
          userId,
          amount: settings.xp.consecutivePurchase,
          reason: "consecutive_purchase",
          idempotencyKey: `xp:consecutive:${orderId}`,
          ref: { kind: "Order", item: orderId },
          description: "خرید مجدد",
        });
        if (!result.ok) throw new Error(result.error ?? "خطا در XP خرید مجدد");
      }
    });

    await step("cashback", async () => {
      const result = await grantCashback({
        userId,
        orderId,
        orderAmount,
        categoryIds,
        productIds: itemProductIds,
      });
      if (!result.ok) throw new Error(result.error ?? "خطا در کش‌بک");
    });

    await step("vip", () => syncVipTier(userId));

    await step("missions", async () => {
      await trackEvent({
        userId,
        metric: "purchase_count",
        value: 1,
        orderAmount,
        idempotencyKey: `order:${orderId}:purchase_count`,
      });
      await trackEvent({
        userId,
        metric: "purchase_amount",
        value: orderAmount,
        orderAmount,
        idempotencyKey: `order:${orderId}:purchase_amount`,
      });
    });

    await step("achievements", () => checkAchievements(userId));

    if (isFirstPurchase) {
      await step("referral", async () => {
        const result = await rewardReferralOnFirstPurchase(
          userId,
          orderId,
          orderAmount,
        );
        if (result.retryable) throw new Error("پرداخت پاداش دعوت نیازمند تلاش مجدد است");
      });
    }

    if (failed) throw new Error("یک یا چند مرحله باشگاه مشتریان ناموفق بود");

    await Order.updateOne(
      { _id: orderId, loyaltyProcessingToken: operationId },
      {
        $set: { loyaltyProcessedAt: new Date() },
        $unset: {
          loyaltyProcessingToken: 1,
          loyaltyProcessingStartedAt: 1,
          loyaltyProcessingExpiresAt: 1,
        },
      },
    );
  } catch (error) {
    await Order.updateOne(
      { _id: orderId, loyaltyProcessingToken: operationId },
      {
        $unset: {
          loyaltyProcessingToken: 1,
          loyaltyProcessingStartedAt: 1,
          loyaltyProcessingExpiresAt: 1,
        },
      },
    ).catch(() => undefined);
    throw error;
  }
}

/** هوک ثبت نظر تأییدشده */
export async function onApprovedReview(userId: string, commentId: string): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings.xp.review > 0) {
      await grantXp({
        userId,
        amount: settings.xp.review,
        reason: "review",
        idempotencyKey: `xp:review:${commentId}`,
        ref: { kind: "Comment", item: commentId },
        description: "ثبت نظر",
      });
    }
    await trackEvent({ userId, metric: "review_count", value: 1 });
    await checkAchievements(userId);
  } catch (err) {
    console.error("[loyalty] onApprovedReview failed:", err);
  }
}

/** هوک ثبت‌نام — XP خوش‌آمد + ساخت کد دعوت + اتصال رفرال */
export async function onUserSignup(
  userId: string,
  referralCode?: string,
  operationId = randomUUID(),
): Promise<{ referral?: { ok: boolean; error?: string } }> {
  const settings = await getSettings();
  const { ensureReferralCode, attachReferral } = await import("./referral.service");

  try {
    await ensureReferralCode(userId);
  } catch (error) {
    console.error(
      `[loyalty] signup code failed operationId=${operationId} userId=${userId}`,
      error,
    );
  }

  let referral: { ok: boolean; error?: string } | undefined;
  if (referralCode) {
    try {
      referral = await attachReferral(userId, referralCode);
    } catch (error) {
      console.error(
        `[loyalty] signup referral failed operationId=${operationId} userId=${userId}`,
        error,
      );
      referral = {
        ok: false,
        error: "اتصال کد دعوت موقتاً انجام نشد؛ امکان تلاش مجدد وجود دارد",
      };
    }
  }

  if (settings.xp.signup > 0) {
    try {
      const xp = await grantXp({
        userId,
        amount: settings.xp.signup,
        reason: "signup",
        idempotencyKey: `xp:signup:${userId}`,
        description: "ثبت‌نام در باشگاه مشتریان",
        applyVipMultiplier: false,
      });
      if (!xp.ok) throw new Error(xp.error ?? "خطای XP ثبت‌نام");
    } catch (error) {
      console.error(
        `[loyalty] signup XP failed operationId=${operationId} userId=${userId}`,
        error,
      );
    }
  }

  return { referral };
}
