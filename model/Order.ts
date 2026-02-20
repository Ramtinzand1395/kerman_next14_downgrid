import mongoose from "mongoose";

const OrderStatusEnum = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PaymentStatusEnum = ["unpaid", "paid", "failed"];

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        price: { type: Number, required: true }, // قیمت واحد
        discountPrice: Number, // قیمت بعد تخفیف
        quantity: { type: Number, required: true },
        total: { type: Number, required: true }, // price * quantity
      },
    ],

    totalPrice: {
      type: Number,
      required: true,
    },

    shippingCost: {
      type: Number,
      default: 0,
    },

    finalPrice: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: OrderStatusEnum,
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: PaymentStatusEnum,
      default: "unpaid",
    },

    trackingCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    description: String,

    // ✅ Loyalty additions
    deliveredAt: { type: Date, default: null },

    // ✅ اگر خواستی اطلاعات زرین پال را داخل Order ذخیره کنی
    payment: {
      provider: { type: String, default: "zarinpal" },
      authority: { type: String, default: null, index: true },
      refId: { type: String, default: null, index: true },
      paidAt: { type: Date, default: null },
    },

    // ✅ وقتی کاربر از امتیاز استفاده می‌کند
    loyalty: {
      pointsSpent: { type: Number, default: 0, min: 0 },
      discountFromPoints: { type: Number, default: 0, min: 0 }, // تومان
    },
  },
  { timestamps: true },
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
