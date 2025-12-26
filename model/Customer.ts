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

export default mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);
