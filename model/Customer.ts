import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "کاربر بی نام",
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    barcodes: { type: [String], default: undefined },
    lastName: {
      type: String,
      required: true,
    },
    sex: {
      type: String,
      enum: ["مرد", "زن"],
      required: true,
    },
    birthday: { type: String },
    description: { type: String },
    persianDate: { type: String },
  },
  {
    timestamps: true,
  }
);

customerSchema.index(
  { barcodes: 1 },
  { unique: true, partialFilterExpression: { "barcodes.0": { $exists: true } } },
);

export default mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);
