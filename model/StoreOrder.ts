import mongoose from "mongoose";
import { StoreCustomerSnapshotSchema } from "./StoreCustomerSnapshot";

const storeOrderSchema = new mongoose.Schema(
  {
  
    list: [
      {
        name: { type: String },
        price: { type: Number },
        size: { type: Number },
        storage: { type: String },
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId }, // Customer ID kept for compatibility with old orders.
    userId: {
      type: mongoose.Schema.Types.ObjectId, ref: "User", index: true,
      required: function (this: { customer?: mongoose.Types.ObjectId }) { return !this.customer; },
    },
    customerSnapshot: StoreCustomerSnapshotSchema,
    description: {
      type: String,
    },
    consoleType: {
      type: String,
      enum: ["ps4", "ps5", "copy", "xbox", "ps5Copy"],
      required: true,
    },
    isLegal: { type: Boolean, default: false },
    deliveryStatus: {
      type: String,
      enum: ["آماده", "تحویل به مشتری", "دریافت از مشتری"],
      default: "دریافت از مشتری",
      required: true,
    },
    deliveryDate: { type: String, default: "تحویل داده نشده", required: true },
    deliveryCode: { type: String, unique: true },
    clientRequestKey: { type: String, trim: true, maxlength: 128, default: null },
  },
  {
    timestamps: true,
  },
);

const generateRandomCode = () => Math.floor(10000 + Math.random() * 90000);

storeOrderSchema.pre("save", async function () {
  if (!this.deliveryCode) {
    let isUnique = false;
    let newCode;

    while (!isUnique) {
      newCode = String(generateRandomCode());
      const existing = await mongoose.models.StoreOrder.findOne({
        deliveryCode: newCode,
      });
      if (!existing) isUnique = true;
    }

    this.deliveryCode = newCode;
  }
});

storeOrderSchema.index({ createdAt: 1, deliveryStatus: 1 });
storeOrderSchema.index(
  { clientRequestKey: 1 },
  { unique: true, partialFilterExpression: { clientRequestKey: { $type: "string" } } },
);

export default mongoose.models.StoreOrder ||
  mongoose.model("StoreOrder", storeOrderSchema);
