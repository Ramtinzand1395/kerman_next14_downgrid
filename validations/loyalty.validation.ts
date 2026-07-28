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
export const couponCreateSchema = z.object({
  code: z.string().min(3, "کد حداقل ۳ کاراکتر").max(40).regex(/^[A-Za-z0-9_-]+$/, "کد فقط حروف/عدد/-/_"),
  title: z.string().max(120).optional(),
  type: z.enum(COUPON_TYPES),
  value: z.number().min(1),
  scope: z.enum(COUPON_SCOPES).default("public"),
  allowedUsers: z.array(objectId).default([]),
  maxDiscountAmount: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0).default(0),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).default(1),
  products: z.array(objectId).default([]),
  categories: z.array(objectId).default([]),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});
export const couponUpdateSchema = couponCreateSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().min(1, "کد تخفیف را وارد کنید"),
  orderAmount: z.number().min(0),
  items: z
    .array(z.object({ productId: objectId, categoryIds: z.array(objectId).optional() }))
    .optional(),
});

// ---- ماموریت ----
export const missionSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  period: z.enum(MISSION_PERIODS),
  metric: z.enum(MISSION_METRICS),
  target: z.number().int().min(1),
  minOrderAmount: z.number().min(0).optional(),
  reward: z.object({
    xp: z.number().int().min(0).default(0),
    walletCredit: z.number().int().min(0).default(0),
    coupon: objectId.optional(),
  }),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export const missionUpdateSchema = missionSchema.partial();

// ---- نشان ----
export const achievementSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "کد فقط حروف کوچک/عدد/_"),
  title: z.string().min(2).max(120),
  description: z.string().max(300).optional(),
  icon: z.string().max(300).optional(),
  metric: z.enum(MISSION_METRICS),
  target: z.number().int().min(1),
  xpReward: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});
export const achievementUpdateSchema = achievementSchema.partial();

// ---- کش‌بک ----
export const cashbackRuleSchema = z.object({
  title: z.string().min(2).max(120),
  percent: z.number().min(0).max(100),
  maxAmount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).default(0),
  vipTiers: z.array(z.enum(VIP_TIERS)).default([]),
  categories: z.array(objectId).default([]),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export const cashbackRuleUpdateSchema = cashbackRuleSchema.partial();

// ---- گردونه ----
export const spinPrizeSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(SPIN_PRIZE_TYPES),
  value: z.number().min(0).default(0),
  coupon: objectId.optional(),
  weight: z.number().min(0).max(100_000),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});
export const spinPrizeUpdateSchema = spinPrizeSchema.partial();

// ---- کمپین ----
export const campaignSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  xpMultiplier: z.number().min(0).max(10).default(1),
  participationXp: z.number().int().min(0).default(0),
  vipEarlyAccessHours: z.number().int().min(0).default(0),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});
export const campaignUpdateSchema = campaignSchema.partial();

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
