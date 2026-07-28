// model/LoginStreak.ts
// زنجیره ورود روزانه — آخرین روز ورود و طول زنجیره؛ با عدم ورود یک روز، ریست می‌شود.
import mongoose, { Schema, model, Document } from "mongoose";

export interface ILoginStreak extends Document {
  user: mongoose.Types.ObjectId;
  /** طول زنجیره فعلی (روز) */
  currentStreak: number;
  /** طولانی‌ترین زنجیره */
  longestStreak: number;
  /** کلید آخرین روز ورود (مثل 2026-07-28) */
  lastLoginDayKey: string;
  /** مجموع پاداش‌های دریافتی از زنجیره (برای حسابرسی) */
  totalRewardsClaimed: number;
  createdAt: Date;
  updatedAt: Date;
}

const LoginStreakSchema = new Schema<ILoginStreak>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastLoginDayKey: { type: String, default: "" },
    totalRewardsClaimed: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const LoginStreak =
  mongoose.models.LoginStreak ||
  model<ILoginStreak>("LoginStreak", LoginStreakSchema);
export default LoginStreak;
