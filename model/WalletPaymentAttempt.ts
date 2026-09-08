import mongoose, { Document, model, Schema } from "mongoose";

export interface IWalletPaymentAttempt extends Document {
  fingerprint: string;
  user: mongoose.Types.ObjectId;
  status: "processing" | "completed" | "failed";
  order?: mongoose.Types.ObjectId;
  error?: string;
  httpStatus?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletPaymentAttemptSchema = new Schema<IWalletPaymentAttempt>(
  {
    // Includes the user id and a canonical representation of the checkout body.
    // The unique index is the cross-process lock for header-less retries.
    fingerprint: { type: String, required: true, unique: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
      required: true,
    },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    error: String,
    httpStatus: Number,
    // A short-lived lock prevents double-clicks/retries while still allowing the
    // customer to intentionally place the same order again later.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

WalletPaymentAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WalletPaymentAttempt =
  mongoose.models.WalletPaymentAttempt ||
  model<IWalletPaymentAttempt>(
    "WalletPaymentAttempt",
    WalletPaymentAttemptSchema,
  );

export default WalletPaymentAttempt;
