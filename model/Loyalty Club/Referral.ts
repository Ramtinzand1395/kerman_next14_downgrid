// model/Referral.ts
// سیستم معرفی دوستان — هر کاربر یک کد دعوت دارد (روی User) و هر ثبت‌نام موفق یک رکورد Referral.
import mongoose, { Schema, model, Document } from "mongoose";

export interface IReferral extends Document {
  /** معرف */
  referrer: mongoose.Types.ObjectId;
  /** کاربر دعوت‌شده */
  referee: mongoose.Types.ObjectId;
  /** کد دعوت استفاده‌شده (اسنپ‌شات برای حسابرسی) */
  code: string;
  status: "registered" | "first_purchase" | "rewarded";
  /** اولین سفارش دعوت‌شده که پاداش بر اساس آن فعال شد */
  firstOrder?: mongoose.Types.ObjectId;
  /** پاداش معرف (تومان اعتبار کیف پول) */
  referrerReward: number;
  /** هدیه کاربر جدید (تومان اعتبار کیف پول) */
  refereeReward: number;
  rewardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // هر کاربر فقط یک بار می‌تواند دعوت‌شده باشد
    },
    code: { type: String, required: true },
    status: {
      type: String,
      enum: ["registered", "first_purchase", "rewarded"],
      default: "registered",
      index: true,
    },
    firstOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    referrerReward: { type: Number, default: 0, min: 0 },
    refereeReward: { type: Number, default: 0, min: 0 },
    rewardedAt: Date,
  },
  { timestamps: true },
);

const Referral =
  mongoose.models.Referral || model<IReferral>("Referral", ReferralSchema);
export default Referral;
