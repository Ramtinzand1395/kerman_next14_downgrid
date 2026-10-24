import mongoose from "mongoose";

const AddressSnapshotSchema = new mongoose.Schema(
  {
    province: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    plaque: { type: String, default: "" },
    unit: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    recipientName: { type: String, default: "" },
    recipientMobile: { type: String, default: "" },
  },
  { _id: false },
);

const VariantAttributeSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    optionId: { type: String, required: true },
    optionLabel: { type: String, required: true },
  },
  { _id: false },
);

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
    addressSnapshot: {
      type: AddressSnapshotSchema,
      default: null,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productTitle: {
          type: String,
          default: null,
        },
        productImage: { type: String, default: null },
        productSku: { type: String, default: null },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        variantTitle: {
          type: String,
          default: null,
        },
        variantSku: {
          type: String,
          default: null,
        },
        variantAttributes: { type: [VariantAttributeSchema], default: [] },
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
    buyerSnapshot: {
      name: { type: String, default: "" },
      mobile: { type: String, default: "" },
    },
    sellerSnapshot: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    totalPrice: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    shippingPaymentType: {
      type: String,
      enum: ["PREPAID", "COLLECT"],
      required: false,
    },
    finalPrice: { type: Number, default: 0 },
    // کوپن اعمال‌شده هنگام درخواست پرداخت (باشگاه مشتریان)
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
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
