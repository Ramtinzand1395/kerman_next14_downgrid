// model/Mission.ts
// تعریف ماموریت‌ها (روزانه/هفتگی/ماهانه/یک‌بار) — کاملاً قابل مدیریت از پنل ادمین.
import mongoose, { Schema, model, Document } from "mongoose";
import { MISSION_PERIODS, MISSION_METRICS, MissionPeriod, MissionMetric } from "@/types/loyalty";

export interface IMissionReward {
  xp: number;
  /** اعتبار کیف پول (تومان) */
  walletCredit: number;
  /** کوپن هدیه (اختیاری) */
  coupon?: mongoose.Types.ObjectId;
}

export interface IMission extends Document {
  title: string;
  description?: string;
  period: MissionPeriod;
  /** معیار سنجش پیشرفت */
  metric: MissionMetric;
  /** مقدار هدف (مثلاً ۳ خرید، یا ۵۰۰٬۰۰۰ تومان) */
  target: number;
  /** حداقل مبلغ هر خرید برای شمردن (برای metric خرید) */
  minOrderAmount?: number;
  reward: IMissionReward;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MissionSchema = new Schema<IMission>(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    period: { type: String, enum: MISSION_PERIODS, required: true, index: true },
    metric: { type: String, enum: MISSION_METRICS, required: true },
    target: { type: Number, required: true, min: 1 },
    minOrderAmount: { type: Number, min: 0 },
    reward: {
      _id: false,
      xp: { type: Number, default: 0, min: 0 },
      walletCredit: { type: Number, default: 0, min: 0 },
      coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
    },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: Date,
    endsAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Mission = mongoose.models.Mission || model<IMission>("Mission", MissionSchema);
export default Mission;
