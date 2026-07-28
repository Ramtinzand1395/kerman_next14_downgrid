// model/MissionProgress.ts
// پیشرفت هر کاربر در هر ماموریت برای هر دوره (periodKey).
// یکتایی (user, mission, periodKey) جلوی دریافت پاداش تکراری در یک دوره را می‌گیرد.
import mongoose, { Schema, model, Document } from "mongoose";

export interface IMissionProgress extends Document {
  user: mongoose.Types.ObjectId;
  mission: mongoose.Types.ObjectId;
  /**
   * کلید دوره — مثال:
   * daily:   "2026-07-28"
   * weekly:  "2026-W31"
   * monthly: "2026-07"
   * once:    "once"
   */
  periodKey: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  /** پاداش پرداخت شد؟ (جدا از completed برای کنترل اتمیک پرداخت) */
  rewardClaimed: boolean;
  rewardClaimedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MissionProgressSchema = new Schema<IMissionProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mission: { type: Schema.Types.ObjectId, ref: "Mission", required: true },
    periodKey: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    rewardClaimed: { type: Boolean, default: false },
    rewardClaimedAt: Date,
  },
  { timestamps: true },
);

MissionProgressSchema.index({ user: 1, mission: 1, periodKey: 1 }, { unique: true });
MissionProgressSchema.index({ user: 1, completed: 1 });

const MissionProgress =
  mongoose.models.MissionProgress ||
  model<IMissionProgress>("MissionProgress", MissionProgressSchema);
export default MissionProgress;
