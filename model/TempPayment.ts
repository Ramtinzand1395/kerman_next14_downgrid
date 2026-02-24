import mongoose from "mongoose";

const TempPaymentSchema = new mongoose.Schema(
  {
    authority: { type: String, unique: true, required: true },
    userId: { type: String, required: true }, // userId می‌تواند ObjectId یا string باشد
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
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    finalPrice: { type: Number, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.TempPayment ||
  mongoose.model("TempPayment", TempPaymentSchema);
