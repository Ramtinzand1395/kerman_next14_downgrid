// model/WalletLog.ts
// لاگ حسابرسی تمام عملیات مالی — جدا از تراکنش‌ها؛ حتی عملیات ناموفق هم لاگ می‌شوند.
import mongoose, { Schema, model, Document } from "mongoose";

export interface IWalletLog extends Document {
  wallet?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  action: string; // مثل charge_attempt, debit, credit, refund, expire, lock_fail
  success: boolean;
  amount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  transaction?: mongoose.Types.ObjectId;
  /** اطلاعات زمینه: IP، userAgent، خطا و... */
  context?: Record<string, unknown>;
  errorMessage?: string;
  performedBy?: mongoose.Types.ObjectId; // مدیر در عملیات دستی
  createdAt: Date;
}

const WalletLogSchema = new Schema<IWalletLog>(
  {
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    success: { type: Boolean, default: true },
    amount: Number,
    balanceBefore: Number,
    balanceAfter: Number,
    transaction: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
    context: { type: Schema.Types.Mixed },
    errorMessage: String,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

WalletLogSchema.index({ createdAt: -1 });

const WalletLog =
  mongoose.models.WalletLog || model<IWalletLog>("WalletLog", WalletLogSchema);
export default WalletLog;
