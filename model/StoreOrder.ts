import mongoose from "mongoose";

const storeOrderSchema = new mongoose.Schema(
  {
    list: {
      type: [String],
      required: true,
    },
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
      enum: ["ps4", "ps5", "copy", "xbox"],
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
  },
  {
    timestamps: true,
  }
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

export default
  mongoose.models.StoreOrder || mongoose.model("StoreOrder", storeOrderSchema);
