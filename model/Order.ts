import mongoose from "mongoose";

const OrderStatusEnum = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PaymentStatusEnum = ["unpaid", "paid", "failed", "pending_refund"];

// Sparse unique indexes ignore a missing field, but still index explicit nulls.
// Optional unique identifiers must therefore be stored as `undefined` when empty.
const normalizeOptionalUniqueString = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized || undefined;
};

const AddressSnapshotSchema = new mongoose.Schema(
  {
    province: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    plaque: { type: String, default: "" },
    unit: { type: String, default: "" },
    postalCode: { type: String, default: "" },
  },
  { _id: false },
);

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

    // Historical copy: remains available if the profile address is edited/deleted.
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
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        variantTitle: {
          type: String,
          default: null,
        },
        price: { type: Number, required: true },
        discountPrice: Number,
        quantity: { type: Number, required: true },
        total: { type: Number, required: true },
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
    paymentGateway: {
      type: String,
      enum: ["zarinpal", "wallet"],
      default: null,
    },
    paymentAuthority: {
      type: String,
      unique: true,
      sparse: true,
      set: normalizeOptionalUniqueString,
    },
    paymentRefId: {
      type: Number,
      index: true,
      sparse: true,
      default: null,
    },
    paymentCardPan: {
      type: String,
      default: null,
    },
    paymentFeeType: {
      type: String,
      default: null,
    },

    paymentFee: {
      type: Number,

      default: null,
    },

    paymentVerifiedAt: {
      type: Date,

      default: null,
    },

    // کوپن اعمال‌شده روی سفارش
    couponCode: {
      type: String,
      default: null,
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },

    // کلید idempotency سمت کلاینت — جلوگیری از ثبت سفارش تکراری (پرداخت کیف پول)
    clientRequestKey: {
      type: String,
      unique: true,
      sparse: true,
      set: normalizeOptionalUniqueString,
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
  },
  { timestamps: true },
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
