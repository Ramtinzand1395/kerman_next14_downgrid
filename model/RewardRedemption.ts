import mongoose, { Schema, model, Document } from "mongoose";

export const RedemptionStatusEnum = ["ISSUED", "USED", "CANCELED", "EXPIRED"] as const;
export type RedemptionStatus = (typeof RedemptionStatusEnum)[number];

export interface IRewardRedemption extends Document {
  user: mongoose.Types.ObjectId;
  reward: mongoose.Types.ObjectId;

  status: RedemptionStatus;
  pointsSpent: number;

  couponCode?: string | null;
  couponPayload?: {
    percent?: number | null;
    amountToman?: number | null;
    maxDiscountToman?: number | null;
    minOrderToman?: number | null;
    expiresAt?: Date | null;
  };

  usedAt?: Date | null;
  canceledAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const RewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reward: { type: Schema.Types.ObjectId, ref: "Reward", required: true, index: true },

    status: { type: String, enum: RedemptionStatusEnum, default: "ISSUED", index: true },

    pointsSpent: { type: Number, required: true, min: 0 },

    couponCode: { type: String, default: null, index: true },
    couponPayload: {
      percent: { type: Number, default: null },
      amountToman: { type: Number, default: null },
      maxDiscountToman: { type: Number, default: null },
      minOrderToman: { type: Number, default: null },
      expiresAt: { type: Date, default: null, index: true },
    },

    usedAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RewardRedemptionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.RewardRedemption ||
  model<IRewardRedemption>("RewardRedemption", RewardRedemptionSchema);