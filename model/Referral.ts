import mongoose, { Schema, model, Document } from "mongoose";

export const ReferralStatusEnum = ["CREATED", "USED", "REWARDED", "CANCELED"] as const;
export type ReferralStatus = (typeof ReferralStatusEnum)[number];

export interface IReferral extends Document {
  code: string; // referralCode معرفی کننده
  referrerUser: mongoose.Types.ObjectId;

  referredUser?: mongoose.Types.ObjectId | null;

  status: ReferralStatus;
  usedAt?: Date | null;
  rewardedAt?: Date | null;

  trigger?: {
    kind?: "ORDER_DELIVERED" | "REPAIR_COMPLETED" | null;
    refId?: string | null;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    code: { type: String, required: true, index: true }, // همون referralCode

    referrerUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUser: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    status: { type: String, enum: ReferralStatusEnum, default: "CREATED", index: true },

    usedAt: { type: Date, default: null },
    rewardedAt: { type: Date, default: null },

    trigger: {
      kind: { type: String, enum: ["ORDER_DELIVERED", "REPAIR_COMPLETED"], default: null },
      refId: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// هر کاربر جدید فقط یک بار می‌تونه referred بشه (ضد تقلب)
ReferralSchema.index(
  { referredUser: 1 },
  { unique: true, partialFilterExpression: { referredUser: { $type: "objectId" } } }
);

// کد معرفی + معرفی کننده یکتا باشه
ReferralSchema.index({ code: 1, referrerUser: 1 });

export default mongoose.models.Referral || model<IReferral>("Referral", ReferralSchema);