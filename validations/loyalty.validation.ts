// validations/loyalty.validation.ts
// اسکیمای Zod برای ورودی‌های API باشگاه مشتریان و کیف پول
import { z } from "zod";
import {
  COUPON_SCOPES,
  COUPON_TYPES,
  MISSION_METRICS,
  MISSION_PERIODS,
  SPIN_PRIZE_TYPES,
  VIP_TIERS,
  WALLET_TX_TYPES,
} from "@/types/loyalty";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "شناسه نامعتبر است");

// ---- کیف پول ----
export const chargeWalletSchema = z.object({
  amount: z
    .number({ message: "مبلغ باید عدد باشد" })
    .int("مبلغ باید عدد صحیح باشد")
    .min(10_000, "حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است")
    .max(50_000_000, "حداکثر مبلغ شارژ ۵۰٬۰۰۰٬۰۰۰ تومان است"),
});

export const walletTxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(WALLET_TX_TYPES).optional(),
});

export const adminGiftSchema = z.object({
  userId: objectId,
  amount: z.number().int().min(1_000, "حداقل هدیه ۱٬۰۰۰ تومان است").max(100_000_000),
  description: z.string().max(300).optional(),
  expiresInDays: z.number().int().min(0).max(3650).optional(),
});

export const adminAdjustSchema = z.object({
  userId: objectId,
  amount: z.number().int().refine((v) => v !== 0, "مبلغ نمی‌تواند صفر باشد"),
  description: z.string().min(3, "توضیح الزامی است").max(300),
});

// ---- کوپن ----
const couponFieldsSchema = z.object({
  code: z.string().min(3, "کد حداقل ۳ کاراکتر").max(40).regex(/^[A-Za-z0-9_-]+$/, "کد فقط حروف/عدد/-/_"),
  title: z.string().max(120).optional(),
  type: z.enum(COUPON_TYPES),
  value: z.number().min(1),
  scope: z.enum(COUPON_SCOPES),
  allowedUsers: z.array(objectId),
  maxDiscountAmount: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1),
  products: z.array(objectId),
  categories: z.array(objectId),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean(),
});
// Zod defaults still run inside partial() in v4. PATCH must contain only the
// fields actually supplied; creation defaults must never erase saved limits.
export const couponUpdateSchema = couponFieldsSchema.partial();
export const couponCreateSchema = couponFieldsSchema.extend({
  scope: couponFieldsSchema.shape.scope.default("public"),
  allowedUsers: couponFieldsSchema.shape.allowedUsers.default([]),
  minPurchaseAmount: couponFieldsSchema.shape.minPurchaseAmount.default(0),
  perUserLimit: couponFieldsSchema.shape.perUserLimit.default(1),
  products: couponFieldsSchema.shape.products.default([]),
  categories: couponFieldsSchema.shape.categories.default([]),
  isActive: couponFieldsSchema.shape.isActive.default(true),
});

// ---- ماموریت ----
const missionRewardFields = z.object({
  xp: z.number().int().min(0),
  walletCredit: z.number().int().min(0),
  coupon: objectId.optional(),
});
const missionFieldsSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  period: z.enum(MISSION_PERIODS),
  metric: z.enum(MISSION_METRICS),
  target: z.number().int().min(1),
  minOrderAmount: z.number().min(0).optional(),
  reward: missionRewardFields,
  isActive: z.boolean(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export const missionUpdateSchema = missionFieldsSchema.partial().extend({
  reward: missionRewardFields.partial().optional(),
});
export const missionSchema = missionFieldsSchema.extend({
  reward: missionRewardFields.extend({
    xp: missionRewardFields.shape.xp.default(0),
    walletCredit: missionRewardFields.shape.walletCredit.default(0),
  }),
  isActive: missionFieldsSchema.shape.isActive.default(true),
});

// ---- نشان ----
const achievementFieldsSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "کد فقط حروف کوچک/عدد/_"),
  title: z.string().min(2).max(120),
  description: z.string().max(300).optional(),
  icon: z.string().max(300).optional(),
  metric: z.enum(MISSION_METRICS),
  target: z.number().int().min(1),
  xpReward: z.number().int().min(0),
  isActive: z.boolean(),
  order: z.number().int(),
});
export const achievementUpdateSchema = achievementFieldsSchema.partial();
export const achievementSchema = achievementFieldsSchema.extend({
  xpReward: achievementFieldsSchema.shape.xpReward.default(0),
  isActive: achievementFieldsSchema.shape.isActive.default(true),
  order: achievementFieldsSchema.shape.order.default(0),
});

// ---- کش‌بک ----
const cashbackRuleFieldsSchema = z.object({
  title: z.string().min(2).max(120),
  percent: z.number().min(0).max(100),
  maxAmount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0),
  vipTiers: z.array(z.enum(VIP_TIERS)),
  categories: z.array(objectId),
  priority: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export const cashbackRuleUpdateSchema = cashbackRuleFieldsSchema.partial();
export const cashbackRuleSchema = cashbackRuleFieldsSchema.extend({
  minOrderAmount: cashbackRuleFieldsSchema.shape.minOrderAmount.default(0),
  vipTiers: cashbackRuleFieldsSchema.shape.vipTiers.default([]),
  categories: cashbackRuleFieldsSchema.shape.categories.default([]),
  priority: cashbackRuleFieldsSchema.shape.priority.default(0),
  isActive: cashbackRuleFieldsSchema.shape.isActive.default(true),
});

// ---- گردونه ----
const spinPrizeFieldsSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(SPIN_PRIZE_TYPES),
  value: z.number().min(0),
  coupon: objectId.optional(),
  weight: z.number().min(0).max(100_000),
  isActive: z.boolean(),
  order: z.number().int(),
});
export const spinPrizeUpdateSchema = spinPrizeFieldsSchema.partial();
export const spinPrizeSchema = spinPrizeFieldsSchema.extend({
  value: spinPrizeFieldsSchema.shape.value.default(0),
  isActive: spinPrizeFieldsSchema.shape.isActive.default(true),
  order: spinPrizeFieldsSchema.shape.order.default(0),
});

// ---- کمپین ----
const campaignFieldsSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  xpMultiplier: z.number().min(0).max(10),
  participationXp: z.number().int().min(0),
  vipEarlyAccessHours: z.number().int().min(0),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean(),
});
export const campaignUpdateSchema = campaignFieldsSchema.partial();
export const campaignSchema = campaignFieldsSchema.extend({
  xpMultiplier: campaignFieldsSchema.shape.xpMultiplier.default(1),
  participationXp: campaignFieldsSchema.shape.participationXp.default(0),
  vipEarlyAccessHours: campaignFieldsSchema.shape.vipEarlyAccessHours.default(0),
  isActive: campaignFieldsSchema.shape.isActive.default(true),
});

// ---- سطوح ----
export const membershipLevelUpdateSchema = z.object({
  titleFa: z.string().min(1).max(60).optional(),
  minXp: z.number().int().min(0).optional(),
  minTotalPurchase: z.number().int().min(0).optional(),
  benefits: z
    .object({
      cashbackBonusPercent: z.number().min(0).max(100).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      xpMultiplier: z.number().min(0).max(10).optional(),
      prioritySupport: z.boolean().optional(),
      earlyAccessHours: z.number().int().min(0).optional(),
      periodicGift: z.boolean().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

// ---- تنظیمات ----
export const loyaltySettingsSchema = z.object({
  xp: z
    .object({
      signup: z.number().int().min(0),
      firstPurchase: z.number().int().min(0),
      purchasePer10k: z.number().int().min(0),
      review: z.number().int().min(0),
      consecutivePurchase: z.number().int().min(0),
      referral: z.number().int().min(0),
      dailyLogin: z.number().int().min(0),
      campaignParticipation: z.number().int().min(0),
    })
    .partial()
    .optional(),
  cashback: z
    .object({ defaultPercent: z.number().min(0).max(100), enabled: z.boolean() })
    .partial()
    .optional(),
  referral: z
    .object({
      referrerReward: z.number().int().min(0),
      refereeReward: z.number().int().min(0),
      minFirstPurchase: z.number().int().min(0),
    })
    .partial()
    .optional(),
  loginStreak: z
    .object({
      dailyXpRewards: z.array(z.number().int().min(0)).length(7),
      daySevenWalletReward: z.number().int().min(0),
    })
    .partial()
    .optional(),
  spin: z
    .object({ enabled: z.boolean(), extraSpinCost: z.number().int().min(0) })
    .partial()
    .optional(),
  wallet: z
    .object({
      minCharge: z.number().int().min(0),
      maxCharge: z.number().int().min(0),
      giftExpiryDays: z.number().int().min(0),
    })
    .partial()
    .optional(),
});
