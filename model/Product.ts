import mongoose, { Schema, model } from "mongoose";

const SpecificationItemSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false } // هر آیتم نیاز به _id جدا ندارد
);

const productSchema = new Schema(
  {
    sku: {
      type: String,
      unique: true,
      default: "UNKNOWN",
    },

    title: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      unique: true,
      required: true,
    },

    description: {
      type: String,
    },

    shortDesc: String,

    price: {
      type: Number,
      required: true,
    },

    discountPrice: Number,

    stock: {
      type: Number,
      default: 0,
    },

    brand: String,

    mainImage: {
      type: String,
      required: true,
    },

    images: [
      {
        type: String,
      },
    ],

    specifications: [
      {
        title: { type: String, required: true },
        items: [SpecificationItemSchema],
      },
    ],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],

    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Product || model("Product", productSchema);
