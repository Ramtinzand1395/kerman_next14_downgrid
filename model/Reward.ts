import mongoose, { Schema, model, Document } from "mongoose";

export const RewardTypeEnum = ["COUPON", "FREE_SHIP", "GIFT"] as const;
export type RewardType = (typeof RewardTypeEnum)[number];

export interface IReward extends Document {
  title: string;
  type: RewardType;
  costPoints: number;
  active: boolean;
  stock?: number | null;

  payload?: {
    percent?: number | null;
    amountToman?: number | null;
    maxDiscountToman?: number | null;
    minOrderToman?: number | null;
    expiresInDays?: number | null;

    giftSku?: string | null;
    giftDesc?: string | null;
  };

  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: RewardTypeEnum, required: true, index: true },

    costPoints: { type: Number, required: true, min: 0 },

    active: { type: Boolean, default: true, index: true },
    stock: { type: Number, default: null, min: 0 },

    payload: {
      percent: { type: Number, default: null },
      amountToman: { type: Number, default: null },
      maxDiscountToman: { type: Number, default: null },
      minOrderToman: { type: Number, default: null },
      expiresInDays: { type: Number, default: null },

      giftSku: { type: String, default: null },
      giftDesc: { type: String, default: null },
    },
  },
  { timestamps: true }
);

RewardSchema.index({ active: 1, type: 1 });

export default mongoose.models.Reward || model<IReward>("Reward", RewardSchema);