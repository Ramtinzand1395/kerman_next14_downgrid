import mongoose, { Schema, model } from "mongoose";

const nonNegativeSafeIntegerField = (required = false) => ({
  type: Number,
  ...(required ? { required: true } : { default: 0 }),
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0,
    message:
      "مقدار باید عدد صحیح، نامنفی و در محدوده امن JavaScript باشد",
  },
});

const nullableMoneyField = () => ({
  type: Number,
  default: null,
  validate: {
    validator: (value: unknown) =>
      value === null ||
      (typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0),
    message:
      "مبلغ تخفیف باید null یا عدد صحیح نامنفی در محدوده امن JavaScript باشد",
  },
});

const SpecificationItemSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }, // هر آیتم نیاز به _id جدا ندارد
);

const FaqItemSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }, // هر سوال نیاز به _id جدا ندارد
);

const VariantSchema = new Schema({
  title: { type: String, required: true },
  sku: String,
  price: nonNegativeSafeIntegerField(true),
  discountPrice: nullableMoneyField(),
  stock: nonNegativeSafeIntegerField(),
});

const productSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    productType: {
      type: String,
      enum: ["single", "multi"],
      default: "single",
    },
    variants: [VariantSchema],

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

    price: nonNegativeSafeIntegerField(true),

    discountPrice: nullableMoneyField(),

    stock: nonNegativeSafeIntegerField(),

    catalogRevision: nonNegativeSafeIntegerField(),
    inventoryVersion: nonNegativeSafeIntegerField(),
    deletedAt: {
      type: Date,
      default: null,
    },

    brand: String,
    seoTitle: String,
    metaDescription: String,
    mainImageAlt: String,
    mainImage: {
      type: String,
      required: true,
    },

    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: "" },
      },
    ],

    specifications: [
      {
        title: { type: String, required: true },
        items: [SpecificationItemSchema],
      },
    ],

    faqs: [FaqItemSchema],

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

  { timestamps: true },
);

productSchema.index({ createdAt: 1 });
productSchema.index({ deletedAt: 1, status: 1 });
productSchema.index({ catalogRevision: 1, _id: 1 });

productSchema.pre("validate", function validateMoneyAndDerivedStock() {
  const product = this as any;

  if (
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice > product.price
  ) {
    product.invalidate(
      "discountPrice",
      "قیمت تخفیف‌خورده نمی‌تواند بیشتر از قیمت باشد",
    );
  }

  for (const [index, variant] of (product.variants ?? []).entries()) {
    if (
      variant.discountPrice !== null &&
      variant.discountPrice !== undefined &&
      variant.discountPrice > variant.price
    ) {
      product.invalidate(
        `variants.${index}.discountPrice`,
        "قیمت تخفیف‌خورده تنوع نمی‌تواند بیشتر از قیمت آن باشد",
      );
    }
  }

  if (product.productType === "multi") {
    let totalStock = 0;
    for (const variant of product.variants ?? []) {
      totalStock += variant.stock;
      if (!Number.isSafeInteger(totalStock)) {
        product.invalidate(
          "stock",
          "مجموع موجودی تنوع‌ها از محدوده عدد صحیح امن خارج است",
        );
        return;
      }
    }
    product.stock = totalStock;
  }
});

export default mongoose.models.Product || model("Product", productSchema);
