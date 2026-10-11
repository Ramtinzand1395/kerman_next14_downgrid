import mongoose, { Schema } from "mongoose";

const VisitRewardSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rule: { type: Schema.Types.ObjectId, ref: "VisitRewardRule", required: true },
    milestone: { type: Number, required: true, min: 1 },
    ruleVersion: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["available", "reserved", "redeemed", "expired", "revoked"],
      default: "available",
      index: true,
    },
    reservedFor: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    reservedAt: { type: Date, default: null },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    sourceAppointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  },
  { timestamps: true },
);

VisitRewardSchema.index({ user: 1, rule: 1, milestone: 1 }, { unique: true });

export default mongoose.models.VisitReward || mongoose.model("VisitReward", VisitRewardSchema);

