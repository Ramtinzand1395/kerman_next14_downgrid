// lib/loyalty/experience.service.ts
// سرویس مدیریت XP، ارتقای Level و ارتقای VIP.
//
// جریان: grantXp → به‌روزرسانی اتمیک Experience → بررسی آستانه Level →
//        ثبت MembershipHistory + Notification در صورت ارتقا.
// VIP جداگانه با syncVipTier بر اساس مجموع خرید (User.totalPurchase) به‌روز می‌شود.
import mongoose from "mongoose";
import Experience from "@/model/Loyalty Club/Experience";
import ExperienceHistory from "@/model/Loyalty Club/ExperienceHistory";
import MembershipLevel from "@/model/Loyalty Club/MembershipLevel";
import MembershipHistory from "@/model/Loyalty Club/MembershipHistory";
import Notification from "@/model/Notification";
import User from "@/model/User";
import { LevelCode, LEVEL_FA, VipTier, VIP_TIER_FA, XpReason } from "@/types/loyalty";
import LoyaltySettings from "@/model/Loyalty Club/LoyaltySettings";

// ---------- تنظیمات ----------

let settingsCache: { data: mongoose.HydratedDocument<import("@/model/Loyalty Club/LoyaltySettings").ILoyaltySettings> | null; at: number } | null = null;

/** تنظیمات سراسری — با کش کوتاه‌مدت ۶۰ ثانیه‌ای */
export async function getSettings() {
  if (settingsCache && Date.now() - settingsCache.at < 60_000 && settingsCache.data) {
    return settingsCache.data;
  }
  const data = await LoyaltySettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true },
  );
  settingsCache = { data, at: Date.now() };
  return data;
}

export function invalidateSettingsCache() {
  settingsCache = null;
}

// ---------- سطوح ----------

/** همه سطوح فعال، مرتب صعودی — کش ۵ دقیقه‌ای */
let levelsCache: { level: { code: LevelCode; minXp: number; titleFa: string }[]; vip: { code: VipTier; minTotalPurchase: number; titleFa: string; benefits: Record<string, unknown> }[]; at: number } | null = null;

export async function getLevels() {
  if (levelsCache && Date.now() - levelsCache.at < 300_000) return levelsCache;
  const docs = await MembershipLevel.find({ isActive: true }).sort({ order: 1 }).lean();
  const level = docs
    .filter((d) => d.kind === "level")
    .map((d) => ({ code: d.code as LevelCode, minXp: d.minXp, titleFa: d.titleFa }));
  const vip = docs
    .filter((d) => d.kind === "vip")
    .map((d) => ({
      code: d.code as VipTier,
      minTotalPurchase: d.minTotalPurchase,
      titleFa: d.titleFa,
      benefits: d.benefits as unknown as Record<string, unknown>,
    }));
  levelsCache = { level, vip, at: Date.now() };
  return levelsCache;
}

export function invalidateLevelsCache() {
  levelsCache = null;
}

/** سطح متناظر با یک مقدار XP */
export function levelForXp(
  xp: number,
  levels: { code: LevelCode; minXp: number }[],
): LevelCode {
  let current: LevelCode = "rookie";
  for (const l of levels) if (xp >= l.minXp) current = l.code;
  return current;
}

/** VIP متناظر با مجموع خرید — null یعنی هنوز VIP نیست */
export function vipForPurchase(
  totalPurchase: number,
  tiers: { code: VipTier; minTotalPurchase: number }[],
): VipTier | null {
  let current: VipTier | null = null;
  for (const t of tiers) if (totalPurchase >= t.minTotalPurchase) current = t.code;
  return current;
}

// ---------- اعطای XP ----------

export interface GrantXpInput {
  userId: string;
  amount: number;
  reason: XpReason;
  idempotencyKey: string;
  ref?: { kind: "Order" | "Comment" | "Referral" | "Mission" | "Campaign" | "SpinHistory"; item: string };
  description?: string;
  /** ضریب VIP روی مبلغ اعمال شود؟ (پیش‌فرش true برای اعطای مثبت) */
  applyVipMultiplier?: boolean;
}

export async function grantXp(input: GrantXpInput): Promise<{
  ok: boolean;
  duplicate?: boolean;
  totalXp?: number;
  level?: LevelCode;
  levelChanged?: boolean;
  error?: string;
}> {
  const { userId, amount, reason, idempotencyKey } = input;
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "مقدار نامعتبر" };

  // Idempotency
  const existing = await ExperienceHistory.findOne({ idempotencyKey }).lean();
  if (existing) return { ok: true, duplicate: true };

  let finalAmount = Math.round(amount);

  // ضریب VIP فقط برای اعطای مثبت
  if (finalAmount > 0 && input.applyVipMultiplier !== false) {
    const user = await User.findById(userId).select("vipTier").lean();
    if (user?.vipTier) {
      const { vip } = await getLevels();
      const tier = vip.find((v) => v.code === user.vipTier);
      const mult = (tier?.benefits?.xpMultiplier as number) ?? 1;
      finalAmount = Math.round(finalAmount * mult);
    }
  }

  const session = await mongoose.startSession();
  let levelChanged = false;
  let newLevel: LevelCode = "rookie";
  let totalXp = 0;
  let oldLevel: LevelCode = "rookie";

  try {
    await session.withTransaction(async () => {
      const exp = await Experience.findOneAndUpdate(
        { user: userId },
        { $inc: { totalXp: finalAmount, monthlyXp: Math.max(0, finalAmount) }, $setOnInsert: { level: "rookie" } },
        { upsert: true, new: true, session },
      );

      // جلوگیری از XP منفی
      if (exp.totalXp < 0) {
        await Experience.updateOne({ user: userId }, { $set: { totalXp: 0, monthlyXp: 0 } }, { session });
        exp.totalXp = 0;
      }

      oldLevel = (exp.level as LevelCode) ?? "rookie";
      const { level } = await getLevels();
      newLevel = levelForXp(exp.totalXp, level);
      levelChanged = newLevel !== oldLevel;

      if (levelChanged) {
        await Experience.updateOne({ user: userId }, { $set: { level: newLevel } }, { session });
        await MembershipHistory.create(
          [{ user: userId, kind: "level", from: oldLevel, to: newLevel, reason: "xp_threshold" }],
          { session },
        );
      }

      await ExperienceHistory.create(
        [
          {
            user: userId,
            amount: finalAmount,
            reason,
            idempotencyKey,
            ref: input.ref
              ? { kind: input.ref.kind, item: input.ref.item }
              : undefined,
            description: input.description,
          },
        ],
        { session },
      );

      totalXp = exp.totalXp;
    });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return { ok: true, duplicate: true };
    }
    throw err;
  } finally {
    await session.endSession();
  }

  // اعلان‌ها بیرون از تراکنش
  if (finalAmount > 0) {
    await Notification.create({
      title: "دریافت امتیاز",
      message: `${finalAmount.toLocaleString("fa-IR")} امتیاز (XP) دریافت کردید.${input.description ? ` ${input.description}` : ""}`,
      type: "xp_gain",
      for: "user",
      user: userId,
    }).catch(() => {});
  }
  if (levelChanged) {
    await Notification.create({
      title: "ارتقای سطح",
      message: `تبریک! سطح شما به «${LEVEL_FA[newLevel]}» ارتقا یافت.`,
      type: "level_up",
      for: "user",
      user: userId,
    }).catch(() => {});
  }

  return { ok: true, totalXp, level: newLevel, levelChanged };
}

// ---------- ارتقای VIP ----------

/**
 * بر اساس مجموع خرید کاربر، سطح VIP را همگام می‌کند.
 * پس از هر پرداخت موفق صدا زده می‌شود.
 */
export async function syncVipTier(userId: string): Promise<{
  changed: boolean;
  tier?: VipTier | null;
}> {
  const user = await User.findById(userId).select("vipTier totalPurchase").lean();
  if (!user) return { changed: false };

  const { vip } = await getLevels();
  const target = vipForPurchase(user.totalPurchase ?? 0, vip);
  const current = (user.vipTier as VipTier | undefined) ?? null;

  if (target === current) return { changed: false, tier: current };

  await User.updateOne({ _id: userId }, { $set: { vipTier: target ?? undefined } });
  await MembershipHistory.create({
    user: userId,
    kind: "vip",
    from: current,
    to: target,
    reason: "purchase_threshold",
  });

  await Notification.create({
    title: target ? "ارتقای عضویت VIP" : "تغییر عضویت VIP",
    message: target
      ? `تبریک! عضویت شما به سطح «${VIP_TIER_FA[target]}» ارتقا یافت.`
      : "سطح عضویت VIP شما به‌روزرسانی شد.",
    type: "vip_change",
    for: "user",
    user: userId,
  }).catch(() => {});

  return { changed: true, tier: target };
}

// ---------- وضعیت کاربر ----------

export async function getUserExperience(userId: string) {
  const exp = await Experience.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { level: "rookie" } },
    { upsert: true, new: true },
  ).lean();

  const { level } = await getLevels();
  const sorted = [...level].sort((a, b) => a.minXp - b.minXp);
  const idx = sorted.findIndex((l) => l.code === exp.level);
  const next = sorted[idx + 1] ?? null;

  return {
    totalXp: exp.totalXp,
    monthlyXp: exp.monthlyXp,
    level: exp.level as LevelCode,
    levelTitle: LEVEL_FA[exp.level as LevelCode],
    nextLevel: next
      ? { code: next.code, title: LEVEL_FA[next.code], minXp: next.minXp, remaining: Math.max(0, next.minXp - exp.totalXp) }
      : null,
  };
}

export async function getXpHistory(userId: string, opts: { page?: number; limit?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const [items, total] = await Promise.all([
    ExperienceHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ExperienceHistory.countDocuments({ user: userId }),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}
