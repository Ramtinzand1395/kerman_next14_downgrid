import mongoose, { Schema, model } from "mongoose";

const PrinterRateLimitSchema = new Schema(
  {
    bucket: {
      type: String,
      enum: ["requests", "failures"],
      required: true,
    },
    keyHash: { type: String, required: true },
    windowId: { type: Number, required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PrinterRateLimitSchema.index(
  { bucket: 1, keyHash: 1, windowId: 1 },
  { unique: true },
);
PrinterRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PrinterRateLimit ||
  model("PrinterRateLimit", PrinterRateLimitSchema);
