import mongoose, { Schema, model } from "mongoose";

const posAuthChallengeSchema = new Schema(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 128,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
      maxlength: 128,
    },
    environment: {
      type: String,
      required: true,
      enum: ["test", "staging", "production"],
      index: true,
    },
    challengeHash: {
      type: String,
      required: true,
      match: /^[0-9a-f]{64}$/,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    attemptCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    versionKey: false,
  },
);

posAuthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
posAuthChallengeSchema.index({ deviceId: 1, createdAt: -1 });

export default
  mongoose.models.PosAuthChallenge ||
  model("PosAuthChallenge", posAuthChallengeSchema);
