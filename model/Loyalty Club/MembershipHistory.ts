// model/MembershipHistory.ts
// تاریخچه تغییر Level و VIP کاربر — صعود، تنزل و تغییر دستی مدیر.
import mongoose, { Schema, model, Document } from "mongoose";
import { LEVEL_CODES, VIP_TIERS, LevelCode, VipTier } from "@/types/loyalty";

export interface IMembershipHistory extends Document {
  user: mongoose.Types.ObjectId;
  kind: "level" | "vip";
  from: LevelCode | VipTier | null;
  to: LevelCode | VipTier;
  reason: "xp_threshold" | "purchase_threshold" | "admin_change" | "system";
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MembershipHistorySchema = new Schema<IMembershipHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["level", "vip"], required: true },
    from: { type: String, enum: [...LEVEL_CODES, ...VIP_TIERS], default: null },
    to: { type: String, enum: [...LEVEL_CODES, ...VIP_TIERS], required: true },
    reason: {
      type: String,
      enum: ["xp_threshold", "purchase_threshold", "admin_change", "system"],
      default: "system",
    },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MembershipHistorySchema.index({ user: 1, createdAt: -1 });

const MembershipHistory =
  mongoose.models.MembershipHistory ||
  model<IMembershipHistory>("MembershipHistory", MembershipHistorySchema);
export default MembershipHistory;
