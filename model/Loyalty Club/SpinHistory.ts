// model/SpinHistory.ts
// تنظیمات جوایز گردونه (SpinPrize) + تاریخچه چرخش کاربران (SpinHistory).
// احتمال هر جایزه از پنل مدیریت قابل تنظیم است (weight).
import mongoose, { Schema, model, Document } from "mongoose";
import { SPIN_PRIZE_TYPES, SpinPrizeType } from "@/types/loyalty";

// ---- تنظیمات جوایز ----
export interface ISpinPrize extends Document {
  title: string;
  type: SpinPrizeType;
  /** مقدار جایزه: تومان (wallet_credit)، مقدار XP، شناسه کوپن، یا متن هدیه */
  value: number;
  coupon?: mongoose.Types.ObjectId;
  /** وزن احتمال — هر چه بزرگ‌تر شانس بیشتر */
  weight: number;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpinPrizeSchema = new Schema<ISpinPrize>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: SPIN_PRIZE_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 },
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
    weight: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SpinPrize =
  mongoose.models.SpinPrize || model<ISpinPrize>("SpinPrize", SpinPrizeSchema);

// ---- تاریخچه چرخش ----
export interface ISpinHistory extends Document {
  user: mongoose.Types.ObjectId;
  /** کلید روز (مثل 2026-07-28) — یکتایی (user, dayKey) یعنی هر روز یک چرخش */
  dayKey: string;
  prize: mongoose.Types.ObjectId;
  prizeSnapshot: { title: string; type: SpinPrizeType; value: number };
  /** آیا جایزه به حساب کاربر اعمال شد؟ */
  applied: boolean;
  createdAt: Date;
}

const SpinHistorySchema = new Schema<ISpinHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dayKey: { type: String, required: true },
    prize: { type: Schema.Types.ObjectId, ref: "SpinPrize", required: true },
    prizeSnapshot: {
      _id: false,
      title: { type: String, required: true },
      type: { type: String, enum: SPIN_PRIZE_TYPES, required: true },
      value: { type: Number, default: 0 },
    },
    applied: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SpinHistorySchema.index({ user: 1, dayKey: 1 }, { unique: true });

const SpinHistory =
  mongoose.models.SpinHistory ||
  model<ISpinHistory>("SpinHistory", SpinHistorySchema);
export default SpinHistory;
