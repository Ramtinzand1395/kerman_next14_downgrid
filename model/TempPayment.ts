import mongoose from "mongoose";

const TempPaymentSchema = new mongoose.Schema(
  {
    authority: { type: String, unique: true, required: true },
    userId: { type: String, required: true }, // userId می‌تواند ObjectId یا string باشد
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    finalPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TempPayment ||
  mongoose.model("TempPayment", TempPaymentSchema);
