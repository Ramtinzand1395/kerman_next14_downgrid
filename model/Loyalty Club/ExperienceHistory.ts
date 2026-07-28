// model/ExperienceHistory.ts
// تاریخچه کامل اعطای XP — هر رویداد یک رکورد؛ idempotencyKey جلوی اعطای تکراری را می‌گیرد.
import mongoose, { Schema, model, Document } from "mongoose";
import { XP_REASONS, XpReason } from "@/types/loyalty";

export interface IExperienceHistory extends Document {
  user: mongoose.Types.ObjectId;
  amount: number; // مثبت = اعطا، منفی = کسر (توسط مدیر)
  reason: XpReason;
  idempotencyKey: string;
  ref?: {
    kind: "Order" | "Comment" | "Referral" | "Mission" | "Campaign" | "SpinHistory";
    item: mongoose.Types.ObjectId;
  };
  description?: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ExperienceHistorySchema = new Schema<IExperienceHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, enum: XP_REASONS, required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    ref: {
      _id: false,
      kind: {
        type: String,
        enum: ["Order", "Comment", "Referral", "Mission", "Campaign", "SpinHistory"],
      },
      item: { type: Schema.Types.ObjectId, refPath: "ref.kind" },
    },
    description: String,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ExperienceHistorySchema.index({ user: 1, createdAt: -1 });

const ExperienceHistory =
  mongoose.models.ExperienceHistory ||
  model<IExperienceHistory>("ExperienceHistory", ExperienceHistorySchema);
export default ExperienceHistory;
