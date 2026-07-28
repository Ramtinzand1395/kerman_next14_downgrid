import mongoose from "mongoose";

const TempPaymentSchema = new mongoose.Schema(
  {
    authority: { type: String, unique: true, required: true },
    idempotencyKey: { type: String, index: true, default: null },
    status: {
      type: String,
      enum: [
        "initiated",
        "paid_pending",
        "completed",
        "refund_required",
        "failed",
      ],
      default: "initiated",
    },
    expiresAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // هدف پرداخت: سفارش فروشگاه یا شارژ کیف پول
    purpose: {
      type: String,
      enum: ["order", "wallet_charge"],
      default: "order",
      index: true,
    },
    // برای شارژ کیف پول: تراکنش pending مرتبط
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      default: null, // برای شارژ کیف پول آدرس لازم نیست
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        variantTitle: {
          type: String,
          default: null,
        },
        price: { type: Number, required: true },
        discountPrice: { type: Number, default: null },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        total: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    gatewayAmount: { type: Number, required: true },
  },
  { timestamps: true },
);
TempPaymentSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
TempPaymentSchema.index(
  { failedAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { status: "failed", failedAt: { $type: "date" } },
  },
);
export default mongoose.models.TempPayment ||
  mongoose.model("TempPayment", TempPaymentSchema);
