import mongoose, { Schema, model } from "mongoose";

const posAuthRateLimitSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^[0-9a-f]{64}$/,
    },
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

posAuthRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default
  mongoose.models.PosAuthRateLimit ||
  model("PosAuthRateLimit", posAuthRateLimitSchema);
