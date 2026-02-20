import mongoose, { Schema, model, Document } from "mongoose";

export const PointsKindEnum = ["EARN", "SPEND", "ADJUST", "EXPIRE"] as const;
export type PointsKind = (typeof PointsKindEnum)[number];

export const PointsStatusEnum = ["PENDING", "CONFIRMED", "CANCELED"] as const;
export type PointsStatus = (typeof PointsStatusEnum)[number];

export const PointsSourceEnum = [
  "ORDER",
  "REPAIR",
  "REFERRAL",
  "REWARD",
  "MANUAL",
] as const;
export type PointsSource = (typeof PointsSourceEnum)[number];

export interface IPointsTransaction extends Document {
  user: mongoose.Types.ObjectId;

  kind: PointsKind; // EARN/SPEND/...
  status: PointsStatus; // PENDING/CONFIRMED/...

  points: number; // + برای EARN / - برای SPEND
  source: PointsSource; // ORDER/REPAIR/...

  sourceRefId: string; // orderId / repairId / referralId / redemptionId

  note?: string;

  availableAt?: Date | null; // زمان قابل خرج شدن (بعد از تحویل/اتمام تعمیر)
  expiresAt?: Date | null; // 12 ماه بعد
  consumedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const PointsTransactionSchema = new Schema<IPointsTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    kind: { type: String, enum: PointsKindEnum, required: true, index: true },
    status: {
      type: String,
      enum: PointsStatusEnum,
      default: "PENDING",
      index: true,
    },

    points: { type: Number, required: true },

    source: {
      type: String,
      enum: PointsSourceEnum,
      required: true,
      index: true,
    },
    sourceRefId: { type: String, required: true },

    note: { type: String, default: "" },

    availableAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ✅ ضد دوبار ثبت شدن همان رویداد (idempotency)
PointsTransactionSchema.index(
  { user: 1, source: 1, sourceRefId: 1, kind: 1 },
  { unique: true },
);

PointsTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.PointsTransaction ||
  model<IPointsTransaction>("PointsTransaction", PointsTransactionSchema);
