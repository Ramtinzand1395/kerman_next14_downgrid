// model/Achievement.ts
// تعریف نشان‌ها (Badge) — قابل مدیریت توسط مدیر؛ شرط کسب با metric + target.
import mongoose, { Schema, model, Document } from "mongoose";
import { MISSION_METRICS, MissionMetric } from "@/types/loyalty";

export interface IAchievement extends Document {
  code: string; // مثل first_purchase, loyal_customer, collector
  title: string;
  description?: string;
  icon?: string; // نام آیکون یا مسیر تصویر
  metric: MissionMetric;
  target: number; // مثلاً ۱۰ سفارش
  /** XP هدیه هنگام کسب نشان */
  xpReward: number;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    description: String,
    icon: String,
    metric: { type: String, enum: MISSION_METRICS, required: true },
    target: { type: Number, required: true, min: 1 },
    xpReward: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Achievement =
  mongoose.models.Achievement ||
  model<IAchievement>("Achievement", AchievementSchema);
export default Achievement;
