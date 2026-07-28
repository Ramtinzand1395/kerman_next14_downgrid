// model/Campaign.ts
// کمپین‌های باشگاه مشتریان — جشنواره‌ها، ضریح XP ویژه، دسترسی زودتر VIPها.
import mongoose, { Schema, model, Document } from "mongoose";
import { XP_REASONS, XpReason } from "@/types/loyalty";

export interface ICampaign extends Document {
  title: string;
  description?: string;
  /** ضریب XP در طول کمپین (مثلاً ۲ = دوبرابر) */
  xpMultiplier: number;
  /** XP ثابت برای شرکت در کمپین */
  participationXp: number;
  /** دلیل XP ثبت‌شده در تاریخچه */
  xpReason: XpReason;
  /** کاربران VIP چند ساعت زودتر دسترسی دارند */
  vipEarlyAccessHours: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true },
    description: String,
    xpMultiplier: { type: Number, default: 1, min: 0 },
    participationXp: { type: Number, default: 0, min: 0 },
    xpReason: { type: String, enum: XP_REASONS, default: "campaign" },
    vipEarlyAccessHours: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Campaign =
  mongoose.models.Campaign || model<ICampaign>("Campaign", CampaignSchema);
export default Campaign;
