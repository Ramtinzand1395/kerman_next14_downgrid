// lib/loyalty/referral.service.ts
// سیستم معرفی دوستان:
// - هر کاربر یک referralCode یکتا دارد (هنگام ثبت‌نام/اولین نیاز ساخته می‌شود).
// - ثبت‌نام با کد → رکورد Referral با وضعیت registered.
// - اولین خرید موفق دعوت‌شده (با حداقل مبلغ) → پاداش معرف + هدیه کاربر جدید به کیف پول.
import crypto from "crypto";
import mongoose from "mongoose";
import User from "@/model/User";
import Referral from "@/model/Loyalty Club/Referral";
import Notification from "@/model/Notification";
import { credit } from "./wallet.service";
import { grantXp, getSettings } from "./experience.service";

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
    const res = await User.findOneAndUpdate(
      { _id: userId, referralCode: { $exists: false } },
      { $set: { referralCode: code } },
      { new: true },
    ).lean();
    if (res?.referralCode) return res.referralCode;
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
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "کد دعوت خالی است" };

  const referrer = await User.findOne({ referralCode: normalized }).select("_id").lean();
  if (!referrer) return { ok: false, error: "کد دعوت معتبر نیست" };
  if (referrer._id.toString() === newUserId) return { ok: false, error: "امکان استفاده از کد دعوت خودتان وجود ندارد" };

  const settings = await getSettings();
  try {
    await Referral.create({
      referrer: referrer._id,
      referee: newUserId,
      code: normalized,
      status: "registered",
      referrerReward: settings.referral.referrerReward,
      refereeReward: settings.referral.refereeReward,
    });
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
): Promise<{ rewarded: boolean }> {
  const referral = await Referral.findOne({ referee: refereeId, status: { $in: ["registered", "first_purchase"] } });
  if (!referral) return { rewarded: false };

  const settings = await getSettings();
  if (orderAmount < settings.referral.minFirstPurchase) return { rewarded: false };

  // قفل اتمیک وضعیت — فقط یک پرداخت می‌تواند پاداش را فعال کند
  const locked = await Referral.findOneAndUpdate(
    { _id: referral._id, status: { $in: ["registered", "first_purchase"] } },
    { $set: { status: "rewarded", firstOrder: orderId, rewardedAt: new Date() } },
    { new: true },
  );
  if (!locked) return { rewarded: false };

  // پاداش معرف
  if (locked.referrerReward > 0) {
    await credit({
      userId: locked.referrer.toString(),
      amount: locked.referrerReward,
      type: "referral_reward",
      idempotencyKey: `referral:referrer:${locked._id}`,
      ref: { kind: "Referral", item: locked._id },
      description: "پاداش معرفی دوستان",
      notify: {
        title: "پاداش معرفی دوستان",
        message: `مبلغ ${locked.referrerReward.toLocaleString("fa-IR")} تومان بابت خرید اول دوست دعوت‌شده‌تان به کیف پول‌تان اضافه شد.`,
      },
    });
  }

  // هدیه کاربر جدید
  if (locked.refereeReward > 0) {
    await credit({
      userId: refereeId,
      amount: locked.refereeReward,
      type: "gift",
      idempotencyKey: `referral:referee:${locked._id}`,
      ref: { kind: "Referral", item: locked._id },
      description: "هدیه ثبت‌نام با کد دعوت",
      notify: {
        title: "هدیه خوش‌آمد",
        message: `مبلغ ${locked.refereeReward.toLocaleString("fa-IR")} تومان هدیه کد دعوت به کیف پول شما اضافه شد.`,
      },
    });
  }

  // XP معرف
  if (settings.xp.referral > 0) {
    await grantXp({
      userId: locked.referrer.toString(),
      amount: settings.xp.referral,
      reason: "referral",
      idempotencyKey: `xp:referral:${locked._id}`,
      ref: { kind: "Referral", item: locked._id.toString() },
      description: "دعوت موفق دوستان",
    });
  }

  await Notification.create({
    title: "معرفی موفق",
    message: "یکی از دوستان دعوت‌شده شما اولین خریدش را انجام داد!",
    type: "referral_reward",
    for: "user",
    user: locked.referrer,
  }).catch(() => {});

  return { rewarded: true };
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
