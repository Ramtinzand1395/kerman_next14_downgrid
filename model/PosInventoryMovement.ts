import mongoose from "mongoose";

const safeInteger = (nonNegative = false) => ({
  type: Number,
  required: true,
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      (!nonNegative || value >= 0),
    message: "value must be a safe integer",
  },
});

const PosInventoryMovementSchema = new mongoose.Schema(
  {
    movementType: { type: String, enum: ["pos_sale"], required: true },
    posSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosSale",
      required: true,
    },
    siteSaleId: { type: String, required: true, immutable: true },
    saleId: { type: String, required: true, immutable: true },
    deviceId: { type: String, required: true, immutable: true },
    itemIndex: { type: Number, required: true, min: 0 },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantityDelta: safeInteger(),
    itemStockBefore: safeInteger(true),
    itemStockAfter: safeInteger(true),
    parentStockBefore: safeInteger(true),
    parentStockAfter: safeInteger(true),
    inventoryVersionBefore: safeInteger(true),
    inventoryVersionAfter: safeInteger(true),
    occurredAtUtc: { type: Date, required: true },
    recordedAtUtc: { type: Date, required: true },
    audit: {
      type: new mongoose.Schema(
        {
          source: { type: String, enum: ["pos"], required: true },
          deviceId: { type: String, required: true },
          referenceId: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
  },
  { timestamps: true },
);

PosInventoryMovementSchema.index(
  { posSale: 1, itemIndex: 1 },
  { unique: true },
);
PosInventoryMovementSchema.index({ productId: 1, createdAt: -1 });
PosInventoryMovementSchema.index({ deviceId: 1, saleId: 1 });

export default mongoose.models.PosInventoryMovement ||
  mongoose.model("PosInventoryMovement", PosInventoryMovementSchema);
