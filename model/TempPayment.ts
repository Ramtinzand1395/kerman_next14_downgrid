import mongoose from "mongoose";

const TempPaymentSchema = new mongoose.Schema(
  {
    authority: { type: String, unique: true, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
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
    totalPrice: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    gatewayAmount: { type: Number, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.TempPayment ||
  mongoose.model("TempPayment", TempPaymentSchema);
