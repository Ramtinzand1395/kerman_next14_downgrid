// model/MembershipLevel.ts
// تعریف سطوح Level (Rookie…Legend) و سطوح VIP (Bronze…Diamond) به‌صورت قابل تنظیم توسط مدیر.
// kind مشخص می‌کند رکورد مربوط به سیستم Level است یا VIP.
import mongoose, { Schema, model, Document } from "mongoose";
import { LEVEL_CODES, VIP_TIERS, LevelCode, VipTier } from "@/types/loyalty";

export interface IMembershipBenefits {
  /** درصد کش‌بک اضافه */
  cashbackBonusPercent: number;
  /** درصد تخفیف اختصاصی */
  discountPercent: number;
  /** ضریب XP (مثلاً 1.5 یعنی ۵۰٪ امتیاز بیشتر) */
  xpMultiplier: number;
  /** اولویت پشتیبانی */
  prioritySupport: boolean;
  /** دسترسی زودتر به جشنواره‌ها (ساعت) */
  earlyAccessHours: number;
  /** ارسال هدیه دوره‌ای */
  periodicGift: boolean;
}

export interface IMembershipLevel extends Document {
  kind: "level" | "vip";
  code: LevelCode | VipTier;
  titleFa: string;
  /** حداقل XP برای رسیدن به این سطح (برای kind=level) */
  minXp: number;
  /** حداقل مجموع خرید (تومان) برای رسیدن به این VIP (برای kind=vip) */
  minTotalPurchase: number;
  benefits: IMembershipBenefits;
  order: number; // ترتیب صعودی سطوح
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BenefitsSchema = new Schema<IMembershipBenefits>(
  {
    cashbackBonusPercent: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    xpMultiplier: { type: Number, default: 1, min: 0 },
    prioritySupport: { type: Boolean, default: false },
    earlyAccessHours: { type: Number, default: 0, min: 0 },
    periodicGift: { type: Boolean, default: false },
  },
  { _id: false },
);

const MembershipLevelSchema = new Schema<IMembershipLevel>(
  {
    kind: { type: String, enum: ["level", "vip"], required: true },
    code: { type: String, enum: [...LEVEL_CODES, ...VIP_TIERS], required: true },
    titleFa: { type: String, required: true },
    minXp: { type: Number, default: 0, min: 0 },
    minTotalPurchase: { type: Number, default: 0, min: 0 },
    benefits: { type: BenefitsSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

MembershipLevelSchema.index({ kind: 1, code: 1 }, { unique: true });

const MembershipLevel =
  mongoose.models.MembershipLevel ||
  model<IMembershipLevel>("MembershipLevel", MembershipLevelSchema);
export default MembershipLevel;
