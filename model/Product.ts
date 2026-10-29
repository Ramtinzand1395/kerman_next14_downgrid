import mongoose, { Schema, model } from "mongoose";

const nonNegativeSafeIntegerField = (required = false) => ({
  type: Number,
  ...(required ? { required: true } : { default: 0 }),
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0,
    message: "مقدار باید عدد صحیح، نامنفی و در محدوده امن JavaScript باشد",
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

const normalizeOptionalUniqueString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const SpecificationItemSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const FaqItemSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const VariantSelectorOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true, min: 0 },
    color: { type: String, default: null },
  },
  { _id: false },
);

const VariantSelectorGroupSchema = new Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    displayType: {
      type: String,
      enum: ["dropdown", "radio", "chips", "swatches"],
      required: true,
    },
    required: { type: Boolean, default: true },
    order: { type: Number, required: true, min: 0 },
    placeholder: { type: String, default: null },
    description: { type: String, default: null },
    options: { type: [VariantSelectorOptionSchema], default: [] },
  },
  { _id: false },
);

const VariantSelectorMappingSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    optionIds: { type: Map, of: String, required: true },
  },
  { _id: false },
);

const VariantSelectorSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    version: { type: Number, enum: [1], default: 1 },
    groups: { type: [VariantSelectorGroupSchema], default: [] },
    mappings: { type: [VariantSelectorMappingSchema], default: [] },
  },
  { _id: false },
);

export const VariantSchema = new Schema({
  title: { type: String, required: true, trim: true },
  sku: { type: String, default: null, trim: true },
  barcode: { type: String, default: null, trim: true },
  price: nonNegativeSafeIntegerField(true),
  discountPrice: nullableMoneyField(),
  stock: nonNegativeSafeIntegerField(),
  isActive: { type: Boolean, default: true },
});

const productSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    productType: {
      type: String,
      enum: ["single", "multi"],
      default: "single",
    },

    variants: [VariantSchema],

    defaultVariantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    variantSelector: {
      type: VariantSelectorSchema,
      default: undefined,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
      set: normalizeOptionalUniqueString,
    },

    // Optional scanner identity for single products. Multi-product barcodes
    // live on their variants so each sellable SKU keeps its own identity.
    barcode: {
      type: String,
      default: null,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      required: true,
      trim: true,
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
      index: true,
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
productSchema.index({ status: 1, deletedAt: 1, _id: 1 });
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
    const variants = product.variants ?? [];
    const activeVariants = variants.filter((v: any) => v.isActive !== false);

    let totalStock = 0;
    for (const variant of activeVariants) {
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

    if (activeVariants.length > 0) {
      const minBasePrice = Math.min(...activeVariants.map((v: any) => v.price));
      const minEffectivePrice = Math.min(
        ...activeVariants.map((v: any) => v.discountPrice ?? v.price),
      );

      product.price = minBasePrice;
      product.discountPrice =
        minEffectivePrice < minBasePrice ? minEffectivePrice : null;
    }
  }
});

export default mongoose.models.Product || model("Product", productSchema);
