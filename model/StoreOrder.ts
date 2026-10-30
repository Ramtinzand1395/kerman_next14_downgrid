import mongoose from "mongoose";

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
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    description: {
      type: String,
    },
    consoleType: {
      type: String,
      enum: ["ps4", "ps5", "copy", "xbox", "ps5Copy"],
      required: true,
    },
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
