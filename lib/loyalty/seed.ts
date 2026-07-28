// lib/loyalty/seed.ts
// Seed اولیه باشگاه مشتریان — سطوح Level، سطوح VIP و تنظیمات سراسری.
// idempotent است؛ چند بار اجرا شدن مشکلی ایجاد نمی‌کند (upsert).
import dbConnect from "@/lib/mongodb";
import MembershipLevel from "@/model/Loyalty Club/MembershipLevel";
import LoyaltySettings from "@/model/Loyalty Club/LoyaltySettings";
import Achievement from "@/model/Loyalty Club/Achievement";
import { LEVEL_FA, VIP_TIER_FA, LevelCode, VipTier } from "@/types/loyalty";

/** آستانه XP هر سطح — قابل ویرایش از پنل مدیریت */
const LEVELS: { code: LevelCode; minXp: number; order: number }[] = [
  { code: "rookie", minXp: 0, order: 1 },
  { code: "gamer", minXp: 500, order: 2 },
  { code: "pro", minXp: 2000, order: 3 },
  { code: "elite", minXp: 6000, order: 4 },
  { code: "legend", minXp: 15000, order: 5 },
];

/** آستانه مجموع خرید (تومان) هر سطح VIP */
const VIP_LEVELS: {
  code: VipTier;
  minTotalPurchase: number;
  order: number;
  benefits: {
    cashbackBonusPercent: number;
    discountPercent: number;
    xpMultiplier: number;
    prioritySupport: boolean;
    earlyAccessHours: number;
    periodicGift: boolean;
  };
}[] = [
  {
    code: "bronze",
    minTotalPurchase: 1_000_000,
    order: 1,
    benefits: {
      cashbackBonusPercent: 1,
      discountPercent: 0,
      xpMultiplier: 1.1,
      prioritySupport: false,
      earlyAccessHours: 0,
      periodicGift: false,
    },
  },
  {
    code: "silver",
    minTotalPurchase: 5_000_000,
    order: 2,
    benefits: {
      cashbackBonusPercent: 2,
      discountPercent: 3,
      xpMultiplier: 1.25,
      prioritySupport: false,
      earlyAccessHours: 12,
      periodicGift: false,
    },
  },
  {
    code: "gold",
    minTotalPurchase: 15_000_000,
    order: 3,
    benefits: {
      cashbackBonusPercent: 3,
      discountPercent: 5,
      xpMultiplier: 1.5,
      prioritySupport: true,
      earlyAccessHours: 24,
      periodicGift: true,
    },
  },
  {
    code: "diamond",
    minTotalPurchase: 40_000_000,
    order: 4,
    benefits: {
      cashbackBonusPercent: 5,
      discountPercent: 8,
      xpMultiplier: 2,
      prioritySupport: true,
      earlyAccessHours: 48,
      periodicGift: true,
    },
  },
];

/** نشان‌های پیش‌فرض */
const ACHIEVEMENTS = [
  { code: "first_purchase", title: "اولین خرید", metric: "purchase_count", target: 1, xpReward: 100, order: 1 },
  { code: "loyal_customer", title: "مشتری وفادار", metric: "purchase_count", target: 5, xpReward: 300, order: 2 },
  { code: "ten_orders", title: "۱۰ سفارش", metric: "purchase_count", target: 10, xpReward: 500, order: 3 },
  { code: "pro_buyer", title: "خریدار حرفه‌ای", metric: "purchase_amount", target: 10_000_000, xpReward: 800, order: 4 },
  { code: "top_referrer", title: "معرف برتر", metric: "referral_count", target: 5, xpReward: 600, order: 5 },
  { code: "collector", title: "کلکسیونر", metric: "purchase_count", target: 25, xpReward: 1500, order: 6 },
] as const;

export async function seedLoyalty() {
  await dbConnect();

  // سطوح Level
  for (const l of LEVELS) {
    await MembershipLevel.updateOne(
      { kind: "level", code: l.code },
      {
        $set: {
          kind: "level",
          code: l.code,
          titleFa: LEVEL_FA[l.code],
          minXp: l.minXp,
          order: l.order,
          isActive: true,
        },
        $setOnInsert: { minTotalPurchase: 0 },
      },
      { upsert: true },
    );
  }

  // سطوح VIP
  for (const v of VIP_LEVELS) {
    await MembershipLevel.updateOne(
      { kind: "vip", code: v.code },
      {
        $set: {
          kind: "vip",
          code: v.code,
          titleFa: VIP_TIER_FA[v.code],
          minTotalPurchase: v.minTotalPurchase,
          order: v.order,
          isActive: true,
        },
        $setOnInsert: { benefits: v.benefits, minXp: 0 },
      },
      { upsert: true },
    );
  }

  // نشان‌ها
  for (const a of ACHIEVEMENTS) {
    await Achievement.updateOne(
      { code: a.code },
      { $set: { ...a, isActive: true } },
      { upsert: true },
    );
  }

  // تنظیمات سراسری (فقط در صورت نبودن ایجاد می‌شود تا تغییرات مدیر حفظ شود)
  await LoyaltySettings.updateOne(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true },
  );

  return { ok: true };
}
