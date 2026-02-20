import mongoose, { Schema, model, Document } from "mongoose";

export const RuleKeyEnum = [
  "ORDER_EARN_PER_100K",           // 10
  "REPAIR_EARN_PER_100K",          // 12
  "REFERRER_BONUS_POINTS",         // 50
  "REFERRED_WELCOME_POINTS",       // 20
  "POINTS_EXPIRE_MONTHS",          // 12
  "REDEEM_100_POINTS_TO_TOMAN",    // 10000
  "REDEEM_CAP_PERCENT",            // 20
] as const;

export type RuleKey = (typeof RuleKeyEnum)[number];

export interface ILoyaltyRule extends Document {
  key: RuleKey;
  valueNumber?: number | null;
  valueString?: string | null;
  active: boolean;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyRuleSchema = new Schema<ILoyaltyRule>(
  {
    key: { type: String, enum: RuleKeyEnum, required: true, unique: true, index: true },
    valueNumber: { type: Number, default: null },
    valueString: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.LoyaltyRule || model<ILoyaltyRule>("LoyaltyRule", LoyaltyRuleSchema);