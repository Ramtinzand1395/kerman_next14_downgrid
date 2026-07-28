// model/Wallet.ts
// کیف پول کاربر — هر کاربر دقیقاً یک کیف پول دارد.
// نکته امنیتی: موجودی فقط از طریق WalletService و داخل تراکنش اتمیک تغییر می‌کند.
import mongoose, { Schema, model, Document } from "mongoose";

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  /** موجودی فعلی (تومان) */
  balance: number;
  /** مجموع مبالغی که هنوز منقضی نشده و تاریخ انقضا دارند */
  expiringCredits: {
    amount: number;
    expiresAt: Date;
    /** شناسه تراکنش مبدا جهت ردیابی */
    sourceTx?: mongoose.Types.ObjectId;
  }[];
  /** شمارنده نسخه برای Optimistic Locking — جلوگیری از race condition */
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // هر کاربر فقط یک کیف پول
      index: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    expiringCredits: [
      {
        _id: false,
        amount: { type: Number, required: true, min: 0 },
        expiresAt: { type: Date, required: true },
        sourceTx: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
      },
    ],
    version: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Wallet = mongoose.models.Wallet || model<IWallet>("Wallet", WalletSchema);
export default Wallet;
