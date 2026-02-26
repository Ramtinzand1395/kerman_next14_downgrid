import mongoose from "mongoose";

const OrderStatusEnum = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PaymentStatusEnum = ["unpaid", "paid", "failed", "pending_refund"];

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
    total: { type: Number, required: true },      },
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
      enum: ["zarinpal"],
      default: null,
    },
    paymentAuthority: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
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
