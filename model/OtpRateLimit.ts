import mongoose, { Schema, model, Document } from "mongoose";

export interface IOtpRateLimit extends Document {
  key: string;
  type: "mobile" | "ip";
  lastSentAt?: Date;
  windowStart: Date;
  count: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const OtpRateLimitSchema = new Schema<IOtpRateLimit>(
  {
    key: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["mobile", "ip"] },
    lastSentAt: { type: Date },
    windowStart: { type: Date, required: true, default: Date.now },
    count: { type: Number, required: true, default: 0 },
    lockedUntil: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  },
);

OtpRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpRateLimit =
  mongoose.models.OtpRateLimit ||
  model<IOtpRateLimit>("OtpRateLimit", OtpRateLimitSchema);

export default OtpRateLimit;
