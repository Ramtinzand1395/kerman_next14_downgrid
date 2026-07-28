// model/WalletTransaction.ts
// دفتر کل تراکنش‌های کیف پول — هر تغییر موجودی دقیقاً یک رکورد اینجا دارد.
// idempotencyKey تضمین می‌کند یک عملیات مالی هرگز دوبار اعمال نشود.
import mongoose, { Schema, model, Document } from "mongoose";
import {
  WALLET_TX_TYPES,
  WALLET_TX_STATUSES,
  WalletTxType,
  WalletTxStatus,
} from "@/types/loyalty";

export interface IWalletTransaction extends Document {
  wallet: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: WalletTxType;
  status: WalletTxStatus;
  /** مبلغ تراکنش — همیشه مثبت؛ جهت با type مشخص می‌شود */
  amount: number;
  /** موجودی کیف پول بعد از اعمال تراکنش (برای حسابرسی) */
  balanceAfter?: number;
  /** کلید یکتا برای Idempotency — جلوگیری از دوباره‌خرج/دوباره‌شارژ */
  idempotencyKey: string;
  /** ارجاع به موجودیت مرتبط (سفارش، پرداخت و...) */
  ref?: {
    kind: "Order" | "TempPayment" | "Mission" | "SpinHistory" | "Referral" | "Campaign" | "Coupon";
    item: mongoose.Types.ObjectId;
  };
  /** درگاه پرداخت و شناسه‌های آن (برای شارژ) */
  gateway?: {
    provider: "zarinpal";
    authority?: string;
    refId?: string;
  };
  /** تاریخ انقضای اعتبار (برای تراکنش‌های قابل انقضا مثل هدیه) */
  expiresAt?: Date;
  description?: string;
  /** مدیر انجام‌دهنده عملیات دستی */
  performedBy?: mongoose.Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: WALLET_TX_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: WALLET_TX_STATUSES,
      default: "pending",
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number },
    idempotencyKey: { type: String, required: true, unique: true },
    ref: {
      _id: false,
      kind: {
        type: String,
        enum: ["Order", "TempPayment", "Mission", "SpinHistory", "Referral", "Campaign", "Coupon"],
      },
      item: { type: Schema.Types.ObjectId, refPath: "ref.kind" },
    },
    gateway: {
      _id: false,
      provider: { type: String, enum: ["zarinpal"] },
      authority: String,
      refId: String,
    },
    expiresAt: { type: Date, index: true },
    description: String,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// ایندکس ترکیبی برای گزارش‌گیری تاریخچه کاربر
WalletTransactionSchema.index({ user: 1, createdAt: -1 });
WalletTransactionSchema.index({ "gateway.authority": 1 }, { sparse: true });

const WalletTransaction =
  mongoose.models.WalletTransaction ||
  model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
export default WalletTransaction;
