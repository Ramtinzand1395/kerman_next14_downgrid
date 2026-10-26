import mongoose, { Schema, model } from "mongoose";
import { CATALOG_CHANGE_KINDS } from "@/lib/pos/catalog-changes";

const PosCatalogChangeSchema = new Schema(
  {
    sequence: { type: Number, required: true, unique: true, min: 1 },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["created", "updated", "deleted"],
      required: true,
    },
    changes: {
      type: [{ type: String, enum: CATALOG_CHANGE_KINDS }],
      required: true,
    },
    action: { type: String, enum: ["upsert", "remove"], required: true },
    snapshot: { type: Schema.Types.Mixed, default: null },
    catalogRevision: { type: Number, required: true, min: 0 },
    inventoryVersion: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, trim: true, maxlength: 50 },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 250,
    },
    occurredAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PosCatalogChangeSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);
PosCatalogChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PosCatalogChange ||
  model("PosCatalogChange", PosCatalogChangeSchema);
