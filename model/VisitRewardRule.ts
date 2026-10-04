import mongoose, { Schema } from "mongoose";

const VisitRewardRuleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    requiredVisits: { type: Number, required: true, min: 1 },
    eligibleServices: {
      type: [String],
      enum: ["game_install", "repair"],
      default: ["game_install", "repair"],
    },
    recurrence: { type: String, enum: ["once", "repeat"], default: "repeat" },
    reward: {
      type: { type: String, enum: ["fixed", "percent", "free_game", "free_shipping"], required: true },
      value: { type: Number, default: 0, min: 0 },
      maxDiscountAmount: { type: Number, default: null, min: 0 },
      minAmount: { type: Number, default: 0, min: 0 },
      combinable: { type: Boolean, default: false },
      eligibleDevices: { type: [String], default: [] },
      eligibleInstallationTypes: { type: [String], enum: ["account", "copy"], default: [] },
      shippingRegion: { type: String, default: "", maxlength: 120 },
      maxShippingCost: { type: Number, default: null, min: 0 },
      validityDays: { type: Number, default: 30, min: 1, max: 3650 },
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: false, index: true },
    version: { type: Number, default: 1, min: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.models.VisitRewardRule || mongoose.model("VisitRewardRule", VisitRewardRuleSchema);

