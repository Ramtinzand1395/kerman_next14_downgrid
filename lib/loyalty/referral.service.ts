// lib/loyalty/referral.service.ts
// سیستم معرفی دوستان:
// - هر کاربر یک referralCode یکتا دارد (هنگام ثبت‌نام/اولین نیاز ساخته می‌شود).
// - ثبت‌نام با کد → رکورد Referral با وضعیت registered.
// - اولین خرید موفق دعوت‌شده (با حداقل مبلغ) → پاداش معرف + هدیه کاربر جدید به کیف پول.
import crypto from "crypto";
import mongoose from "mongoose";
import User from "@/model/User";
import Referral from "@/model/Loyalty Club/Referral";
import { notifyUser } from "@/lib/notifications/service";
import { credit } from "./wallet.service";
import { grantXp, getSettings } from "./experience.service";
import { randomUUID } from "node:crypto";
import {
  isRewardOrderEligible,
  normalizeReferralCode,
  referralRewardKeys,
  REFERRAL_CODE_PATTERN,
} from "./referral.policy";

const REWARD_LOCK_MS = 2 * 60_000;

/** ساخت کد دعوت خوانا و یکتا: KA-XXXXXX */
export function generateReferralCode(): string {
  return `KA-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/** کد دعوت کاربر را برمی‌گرداند؛ اگر ندارد می‌سازد */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await User.findById(userId).select("referralCode").lean();
  if (user?.referralCode) return user.referralCode;

  // تلاش با retry برای برخورد نادر تکرار
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    try {
      const res = await User.findOneAndUpdate(
        {
          _id: userId,
          $or: [
            { referralCode: { $exists: false } },
            { referralCode: null },
            { referralCode: "" },
          ],
        },
        { $set: { referralCode: code } },
        { returnDocument: "after" },
      ).lean();
      if (res?.referralCode) return res.referralCode;
    } catch (err) {
      // برخورد کد تصادفی با unique index؛ در تلاش بعدی کد جدید می‌سازیم.
      if ((err as { code?: number })?.code !== 11000) throw err;
    }
    const again = await User.findById(userId).select("referralCode").lean();
    if (again?.referralCode) return again.referralCode;
  }
  throw new Error("خطا در ساخت کد دعوت");
}

/**
 * اتصال کاربر جدید به معرف — هنگام ثبت‌نام صدا زده می‌شود.
 * قوانین: خودمعرفی ممنوع، هر کاربر فقط یک بار دعوت‌شده.
 */
export async function attachReferral(
  newUserId: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return { ok: false, error: "کد دعوت خالی است" };

  const newUser = await User.findById(newUserId)
    .select("pendingReferralCode")
    .lean();
  if (!newUser) return { ok: false, error: "کاربر یافت نشد" };
  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    await User.updateOne(
      { _id: newUserId, pendingReferralCode: normalized },
      { $unset: { pendingReferralCode: 1 } },
    );
    return { ok: false, error: "فرمت کد دعوت باید به شکل KA-XXXXXX باشد" };
  }

  const existingReferral = await Referral.findOne({ referee: newUserId })
    .select("_id")
    .lean();
  if (existingReferral) {
    return { ok: false, error: "این کاربر قبلاً با کد دعوت ثبت شده است" };
  }

  if (newUser.pendingReferralCode !== normalized) {
    return {
      ok: false,
      error: "کد دعوت فقط در همان جریان معتبر تکمیل ثبت‌نام قابل استفاده است",
    };
  }

  const referrer = await User.findOne({ referralCode: normalized }).select("_id").lean();
  if (!referrer) {
    await User.updateOne(
      { _id: newUserId, pendingReferralCode: normalized },
      { $unset: { pendingReferralCode: 1 } },
    );
    return { ok: false, error: "کد دعوت معتبر نیست" };
  }
  if (referrer._id.toString() === newUserId) {
    await User.updateOne(
      { _id: newUserId, pendingReferralCode: normalized },
      { $unset: { pendingReferralCode: 1 } },
    );
    return { ok: false, error: "امکان استفاده از کد دعوت خودتان وجود ندارد" };
  }

  const settings = await getSettings();
  try {
    await Referral.create({
      referrer: referrer._id,
      referee: newUserId,
      code: normalized,
      status: "registered",
      referrerReward: settings.referral.referrerReward,
      refereeReward: settings.referral.refereeReward,
      xpReward: settings.xp.referral,
    });
    await User.updateOne(
      { _id: newUserId, pendingReferralCode: normalized },
      { $unset: { pendingReferralCode: 1 } },
    );
    return { ok: true };
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return { ok: false, error: "این کاربر قبلاً با کد دعوت ثبت شده است" };
    }
    throw err;
  }
}

/**
 * فعال‌سازی پاداش رفرال بعد از اولین خرید موفق دعوت‌شده.
 * idempotent بر اساس شناسه سفارش.
 */
export async function rewardReferralOnFirstPurchase(
  refereeId: string,
  orderId: string,
  orderAmount: number,
): Promise<{ rewarded: boolean; retryable?: boolean }> {
  let referral = await Referral.findOne({ referee: refereeId });
  if (!referral) return { rewarded: false };
  if (referral.status === "rewarded") return { rewarded: true };

  if (!referral.firstOrder) {
    const claimedFirstOrder = await Referral.findOneAndUpdate(
      {
        _id: referral._id,
        firstOrder: { $exists: false },
        status: { $in: ["registered", "first_purchase"] },
      },
      { $set: { firstOrder: orderId, status: "first_purchase" } },
      { returnDocument: "after" },
    );
    referral = claimedFirstOrder ?? (await Referral.findById(referral._id));
    if (!referral) return { rewarded: false };
  }

  const settings = await getSettings();
  if (
    !isRewardOrderEligible({
      firstOrderId: referral.firstOrder?.toString(),
      orderId,
      orderAmount,
      minimumAmount: settings.referral.minFirstPurchase,
    })
  ) {
    return { rewarded: false };
  }

  const operationId = randomUUID();
  const now = new Date();
  const locked = await Referral.findOneAndUpdate(
    {
      _id: referral._id,
      firstOrder: orderId,
      status: { $ne: "rewarded" },
      $or: [
        { processingExpiresAt: { $exists: false } },
        { processingExpiresAt: null },
        { processingExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "rewarding",
        processingToken: operationId,
        processingStartedAt: now,
        processingExpiresAt: new Date(now.getTime() + REWARD_LOCK_MS),
        xpReward: referral.xpReward ?? settings.xp.referral,
      },
    },
    { returnDocument: "after" },
  );
  if (!locked) return { rewarded: false, retryable: true };
  const rewardKeys = referralRewardKeys(locked._id.toString());

  try {
    if (!locked.referrerRewardedAt) {
      if (locked.referrerReward > 0) {
        const result = await credit({
          userId: locked.referrer.toString(),
          amount: locked.referrerReward,
          type: "referral_reward",
          idempotencyKey: rewardKeys.referrer,
          ref: { kind: "Referral", item: locked._id },
          description: "پاداش معرفی دوستان",
          notify: {
            title: "پاداش معرفی دوستان",
            message: `مبلغ ${locked.referrerReward.toLocaleString("fa-IR")} تومان بابت خرید اول دوست دعوت‌شده‌تان به کیف پول‌تان اضافه شد.`,
          },
        });
        if (!result.ok) throw new Error(`REFERRER_CREDIT_FAILED:${result.error ?? "unknown"}`);
      }
      await Referral.updateOne(
        { _id: locked._id, processingToken: operationId },
        { $set: { referrerRewardedAt: new Date() } },
      );
    }

    if (!locked.refereeRewardedAt) {
      if (locked.refereeReward > 0) {
        const result = await credit({
          userId: refereeId,
          amount: locked.refereeReward,
          type: "gift",
          idempotencyKey: rewardKeys.referee,
          ref: { kind: "Referral", item: locked._id },
          description: "هدیه ثبت‌نام با کد دعوت",
          notify: {
            title: "هدیه خوش‌آمد",
            message: `مبلغ ${locked.refereeReward.toLocaleString("fa-IR")} تومان هدیه کد دعوت به کیف پول شما اضافه شد.`,
          },
        });
        if (!result.ok) throw new Error(`REFEREE_CREDIT_FAILED:${result.error ?? "unknown"}`);
      }
      await Referral.updateOne(
        { _id: locked._id, processingToken: operationId },
        { $set: { refereeRewardedAt: new Date() } },
      );
    }

    if (!locked.xpRewardedAt) {
      if (locked.xpReward > 0) {
        const result = await grantXp({
          userId: locked.referrer.toString(),
          amount: locked.xpReward,
          reason: "referral",
          idempotencyKey: rewardKeys.xp,
          ref: { kind: "Referral", item: locked._id.toString() },
          description: "دعوت موفق دوستان",
        });
        if (!result.ok) throw new Error(`REFERRAL_XP_FAILED:${result.error ?? "unknown"}`);
      }
      await Referral.updateOne(
        { _id: locked._id, processingToken: operationId },
        { $set: { xpRewardedAt: new Date() } },
      );
    }

    const completed = await Referral.findOneAndUpdate(
      {
        _id: locked._id,
        processingToken: operationId,
        referrerRewardedAt: { $exists: true },
        refereeRewardedAt: { $exists: true },
        xpRewardedAt: { $exists: true },
      },
      {
        $set: { status: "rewarded", rewardedAt: new Date() },
        $unset: {
          processingToken: 1,
          processingStartedAt: 1,
          processingExpiresAt: 1,
        },
      },
      { returnDocument: "after" },
    );
    if (!completed) throw new Error("REFERRAL_FINALIZE_FAILED");

    await notifyUser({
      userId: locked.referrer,
      title: "معرفی موفق",
      message: "یکی از دوستان دعوت‌شده شما اولین خریدش را انجام داد!",
      type: "referral_reward",
      category: "loyalty",
      link: "/my-profile?step=9",
      eventKey: `REFERRAL_REWARD:${locked._id}`,
    }).catch(() => {});

    return { rewarded: true };
  } catch (error) {
    console.error(
      `[loyalty] referral reward failed operationId=${operationId} referralId=${locked._id}`,
      error,
    );
    await Referral.updateOne(
      { _id: locked._id, processingToken: operationId },
      {
        $set: { status: "first_purchase" },
        $unset: {
          processingToken: 1,
          processingStartedAt: 1,
          processingExpiresAt: 1,
        },
      },
    ).catch(() => undefined);
    return { rewarded: false, retryable: true };
  }
}

/** آمار رفرال کاربر */
export async function getReferralStats(userId: string) {
  const code = await ensureReferralCode(userId);
  const [total, rewarded, pendingAgg] = await Promise.all([
    Referral.countDocuments({ referrer: userId }),
    Referral.countDocuments({ referrer: userId, status: "rewarded" }),
    Referral.aggregate<{ total: number }>([
      { $match: { referrer: new mongoose.Types.ObjectId(userId), status: "rewarded" } },
      { $group: { _id: null, total: { $sum: "$referrerReward" } } },
    ]),
  ]);
  return {
    code,
    totalInvited: total,
    successful: rewarded,
    totalEarned: pendingAgg[0]?.total ?? 0,
  };
}
