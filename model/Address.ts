import mongoose, { Schema, models, model } from "mongoose";

const AddressSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    province: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    plaque: { type: String },
    unit: { type: String },
    postalCode: { type: String },
  },
  { timestamps: true }
);

export default models.Address || model("Address", AddressSchema);
