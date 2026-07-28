/**
 * انواع و ثابت‌های مشترک سیستم باشگاه مشتریان و کیف پول
 * تمام enumها و ثابت‌های Level / VIP / تراکنش‌ها در این فایل متمرکز شده‌اند
 * تا بین مدل‌ها، سرویس‌ها و APIها یک منبع واحد (Single Source of Truth) وجود داشته باشد.
 */

// ---------------- کیف پول ----------------

/** نوع تراکنش کیف پول */
export const WALLET_TX_TYPES = [
  "charge", // شارژ از طریق درگاه
  "payment", // پرداخت سفارش (کسر از کیف پول)
  "refund", // بازگشت وجه سفارش لغوشده
  "cashback", // کش‌بک خرید
  "gift", // هدیه مدیر
  "referral_reward", // پاداش معرفی دوستان
  "spin_reward", // جایزه گردونه شانس
  "mission_reward", // پاداش ماموریت
  "expire", // انقضای اعتبار
  "admin_adjust", // تعدیل دستی توسط مدیر
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

/** وضعیت تراکنش کیف پول */
export const WALLET_TX_STATUSES = [
  "pending",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WalletTxStatus = (typeof WALLET_TX_STATUSES)[number];

// ---------------- تجربه (XP) ----------------

/** دلایل اعطای XP */
export const XP_REASONS = [
  "signup", // ثبت‌نام
  "first_purchase", // اولین خرید
  "purchase", // هر خرید
  "review", // ثبت نظر
  "consecutive_purchase", // خریدهای متوالی
  "referral", // دعوت دوستان
  "daily_login", // ورود روزانه
  "campaign", // شرکت در کمپین
  "mission", // تکمیل ماموریت
  "spin", // گردونه شانس
  "admin_grant", // اعطای دستی مدیر
] as const;
export type XpReason = (typeof XP_REASONS)[number];

// ---------------- سطح (Level) ----------------

export const LEVEL_CODES = [
  "rookie",
  "gamer",
  "pro",
  "elite",
  "legend",
] as const;
export type LevelCode = (typeof LEVEL_CODES)[number];

export const LEVEL_FA: Record<LevelCode, string> = {
  rookie: "تازه‌کار",
  gamer: "بازیکن",
  pro: "حرفه‌ای",
  elite: "نخبه",
  legend: "افسانه",
};

// ---------------- عضویت VIP ----------------

export const VIP_TIERS = ["bronze", "silver", "gold", "diamond"] as const;
export type VipTier = (typeof VIP_TIERS)[number];

export const VIP_TIER_FA: Record<VipTier, string> = {
  bronze: "برنزی",
  silver: "نقره‌ای",
  gold: "طلایی",
  diamond: "الماس",
};

// ---------------- کوپن ----------------

export const COUPON_TYPES = ["percent", "fixed"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_SCOPES = ["public", "private"] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

// ---------------- ماموریت ----------------

export const MISSION_PERIODS = ["daily", "weekly", "monthly", "once"] as const;
export type MissionPeriod = (typeof MISSION_PERIODS)[number];

export const MISSION_METRICS = [
  "purchase_count", // تعداد خرید
  "purchase_amount", // مجموع مبلغ خرید
  "review_count", // تعداد نظر
  "referral_count", // تعداد دعوت موفق
  "login_days", // روزهای ورود
] as const;
export type MissionMetric = (typeof MISSION_METRICS)[number];

// ---------------- گردونه شانس ----------------

export const SPIN_PRIZE_TYPES = [
  "wallet_credit", // اعتبار کیف پول
  "xp", // امتیاز
  "coupon", // کد تخفیف
  "free_shipping", // ارسال رایگان
  "special_gift", // هدیه ویژه
  "nothing", // پوچ
] as const;
export type SpinPrizeType = (typeof SPIN_PRIZE_TYPES)[number];

// ---------------- اعلان‌ها (باشگاه مشتریان) ----------------

export const LOYALTY_NOTIF_TYPES = [
  "wallet_credit", // افزایش موجودی
  "cashback", // دریافت کش‌بک
  "xp_gain", // دریافت XP
  "level_up", // تغییر Level
  "vip_change", // تغییر VIP
  "mission_complete", // تکمیل ماموریت
  "gift", // دریافت هدیه
  "credit_expiry", // انقضای اعتبار
  "achievement", // دریافت نشان
  "spin_reward", // جایزه گردونه
  "referral_reward", // پاداش معرفی
] as const;
export type LoyaltyNotifType = (typeof LOYALTY_NOTIF_TYPES)[number];
