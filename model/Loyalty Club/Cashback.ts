// model/Cashback.ts
// قوانین کش‌بک — چند قاعده هم‌زمان می‌توانند فعال باشند؛ سرویس بهترین/منطبق‌ترین را انتخاب می‌کند.
import mongoose, { Schema, model, Document } from "mongoose";
import { VIP_TIERS, VipTier } from "@/types/loyalty";

export interface ICashbackRule extends Document {
  title: string;
  /** درصد کش‌بک از مبلغ سفارش */
  percent: number;
  /** سقف کش‌بک هر سفارش (تومان) — null = بدون سقف */
  maxAmount?: number;
  /** حداقل مبلغ سفارش برای فعال شدن قاعده */
  minOrderAmount: number;
  /** محدود به سطح VIP خاص (خالی = همه) */
  vipTiers: VipTier[];
  /** محدود به دسته‌بندی خاص (خالی = همه) */
  categories: mongoose.Types.ObjectId[];
  /** اولویت — عدد بزرگ‌تر = برنده در تداخل */
  priority: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CashbackRuleSchema = new Schema<ICashbackRule>(
  {
    title: { type: String, required: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
    maxAmount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    vipTiers: [{ type: String, enum: VIP_TIERS }],
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true },
);

const CashbackRule =
  mongoose.models.CashbackRule ||
  model<ICashbackRule>("CashbackRule", CashbackRuleSchema);
export default CashbackRule;
