import mongoose, { Schema, model } from "mongoose";

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true },
    coverImage: { type: String, default: "" },
    published: { type: Boolean, default: true },
     metaDescription: { type: String, default: "", trim: true },
    focusKeyword: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.Blog || model("Blog", blogSchema);
