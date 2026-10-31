import mongoose, { Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      unique: true,
      required: true,
    },

    seoTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    introduction: { type: String, default: "" },
    buyingGuide: { type: String, default: "" },
    faqs: { type: [new Schema({ question: String, answer: String }, { _id: false })], default: [] },

    // parentId -> parent
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Category || model("Category", categorySchema);
