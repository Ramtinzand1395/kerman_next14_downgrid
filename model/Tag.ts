import mongoose, { Schema, model } from "mongoose";

const TagSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
});

export default mongoose.models.Tag || model("Tag", TagSchema);
