import mongoose from "mongoose";

const nonNegativeSafeInteger = (required = true) => ({
  type: Number,
  required,
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    message: "value must be a non-negative safe integer",
  },
});

const signedSafeInteger = () => ({
  type: Number,
  required: true,
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" && Number.isSafeInteger(value),
    message: "value must be a safe integer",
  },
});

const PosPriceSnapshotSchema = new mongoose.Schema(
  {
    siteBasePriceToman: nonNegativeSafeInteger(),
    siteDiscountedPriceToman: {
      ...nonNegativeSafeInteger(false),
      default: null,
      validate: {
        validator: (value: unknown) =>
          value === null ||
          (typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0),
        message: "discounted price must be null or a non-negative safe integer",
      },
    },
    siteEffectivePriceToman: nonNegativeSafeInteger(),
    posNetUnitPriceToman: nonNegativeSafeInteger(),
    differenceToman: signedSafeInteger(),
    mismatch: { type: Boolean, required: true },
    catalogRevision: nonNegativeSafeInteger(),
    inventoryVersionBefore: nonNegativeSafeInteger(),
  },
  { _id: false },
);

const PosInventorySnapshotSchema = new mongoose.Schema(
  {
    itemStockBefore: nonNegativeSafeInteger(),
    itemStockAfter: nonNegativeSafeInteger(),
    parentStockBefore: nonNegativeSafeInteger(),
    parentStockAfter: nonNegativeSafeInteger(),
    inventoryVersionAfter: nonNegativeSafeInteger(),
  },
  { _id: false },
);

export const PosSaleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    productName: { type: String, required: true },
    variantName: { type: String, default: null },
    sku: { type: String, default: null },
    barcode: { type: String, default: null },
    productType: {
      type: String,
      enum: ["single", "multi"],
      required: true,
    },
    quantity: { ...nonNegativeSafeInteger(), min: 1 },
    unitPriceToman: nonNegativeSafeInteger(),
    discountToman: nonNegativeSafeInteger(),
    finalAmountToman: nonNegativeSafeInteger(),
    priceSnapshot: { type: PosPriceSnapshotSchema, required: true },
    inventorySnapshot: { type: PosInventorySnapshotSchema, required: true },
  },
  { _id: false },
);

export default PosSaleItemSchema;
