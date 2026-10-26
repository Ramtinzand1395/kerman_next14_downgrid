import mongoose, { Schema, model } from "mongoose";

const PosCatalogCounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, immutable: true },
    value: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.PosCatalogCounter ||
  model("PosCatalogCounter", PosCatalogCounterSchema);

