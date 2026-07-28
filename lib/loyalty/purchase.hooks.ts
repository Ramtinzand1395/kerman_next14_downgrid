// lib/loyalty/purchase.hooks.ts
// ارکستراتور رویدادهای باشگاه مشتریان پس از «پرداخت موفق سفارش»:
//   XP خرید (اولین/متوالی/معمولی) → کش‌بک → شمارنده‌های User → VIP →
//   ماموریت‌ها → نشان‌ها → رفرال
// همه مراحل idempotent‌اند؛ خطای هر مرحله فلو را نمی‌شکند ولی لاگ می‌شود.
import User from "@/model/User";
import { grantXp, getSettings, syncVipTier } from "./experience.service";
import { grantCashback } from "./cashback.service";
import { trackEvent } from "./mission.service";
import { checkAchievements } from "./achievement.service";
import { rewardReferralOnFirstPurchase } from "./referral.service";

export interface PurchaseHookInput {
  userId: string;
  orderId: string;
  /** مبلغ نهایی پرداخت‌شده سفارش (تومان) */
  orderAmount: number;
  categoryIds?: string[];
}

export async function onSuccessfulPurchase(input: PurchaseHookInput): Promise<void> {
  const { userId, orderId, orderAmount } = input;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      console.error(`[loyalty] onSuccessfulPurchase/${name} failed:`, err);
    }
  };

  const settings = await getSettings();

  // ۱) شمارنده‌های کاربر — آیا این اولین خرید است؟
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { successfulOrders: 1, totalPurchase: orderAmount } },
    { new: true },
  ).lean();
  if (!user) return;

  const isFirstPurchase = user.successfulOrders === 1;

  // ۲) XP خرید
  await step("xp", async () => {
    if (isFirstPurchase && settings.xp.firstPurchase > 0) {
      await grantXp({
        userId,
        amount: settings.xp.firstPurchase,
        reason: "first_purchase",
        idempotencyKey: `xp:first-purchase:${orderId}`,
        ref: { kind: "Order", item: orderId },
        description: "اولین خرید",
      });
    }
    // XP بر اساس مبلغ — هر ۱۰٬۰۰۰ تومان
    const base = Math.floor(orderAmount / 10_000) * settings.xp.purchasePer10k;
    if (base > 0) {
      await grantXp({
        userId,
        amount: base,
        reason: "purchase",
        idempotencyKey: `xp:purchase:${orderId}`,
        ref: { kind: "Order", item: orderId },
        description: "خرید از فروشگاه",
      });
    }
    // XP خرید متوالی (دومین خرید به بعد)
    if (!isFirstPurchase && settings.xp.consecutivePurchase > 0) {
      await grantXp({
        userId,
        amount: settings.xp.consecutivePurchase,
        reason: "consecutive_purchase",
        idempotencyKey: `xp:consecutive:${orderId}`,
        ref: { kind: "Order", item: orderId },
        description: "خرید مجدد",
      });
    }
  });

  // ۳) کش‌بک
  await step("cashback", () =>
    grantCashback({ userId, orderId, orderAmount, categoryIds: input.categoryIds }),
  );

  // ۴) VIP
  await step("vip", () => syncVipTier(userId));

  // ۵) ماموریت‌ها
  await step("missions", async () => {
    await trackEvent({ userId, metric: "purchase_count", value: 1, orderAmount });
    await trackEvent({ userId, metric: "purchase_amount", value: orderAmount, orderAmount });
  });

  // ۶) نشان‌ها
  await step("achievements", () => checkAchievements(userId));

  // ۷) رفرال (اولین خرید دعوت‌شده)
  if (isFirstPurchase) {
    await step("referral", () => rewardReferralOnFirstPurchase(userId, orderId, orderAmount));
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
export async function onUserSignup(userId: string, referralCode?: string): Promise<void> {
  try {
    const settings = await getSettings();
    const { ensureReferralCode, attachReferral } = await import("./referral.service");

    await ensureReferralCode(userId);

    if (settings.xp.signup > 0) {
      await grantXp({
        userId,
        amount: settings.xp.signup,
        reason: "signup",
        idempotencyKey: `xp:signup:${userId}`,
        description: "ثبت‌نام در باشگاه مشتریان",
        applyVipMultiplier: false,
      });
    }

    if (referralCode) {
      await attachReferral(userId, referralCode);
    }
  } catch (err) {
    console.error("[loyalty] onUserSignup failed:", err);
  }
}
