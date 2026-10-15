import mongoose, { Schema, model } from "mongoose";
import type { ClientSession, Types } from "mongoose";
import { allocateCatalogChangeSequence } from "./SequenceCounter";

const positiveSafeInteger = {
  validator: (value: unknown) =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0,
  message: "Value must be a positive safe integer",
};

const catalogChangeSchema = new Schema(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      validate: positiveSafeInteger,
    },
    kind: {
      type: String,
      enum: ["upsert", "delete"],
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
      validate: positiveSafeInteger,
    },
    catalogRevision: {
      type: Number,
      default: null,
      validate: {
        validator: (value: unknown) =>
          value === null ||
          (typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0),
        message: "catalogRevision must be null or a non-negative safe integer",
      },
    },
    inventoryVersion: {
      type: Number,
      default: null,
      validate: {
        validator: (value: unknown) =>
          value === null ||
          (typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0),
        message: "inventoryVersion must be null or a non-negative safe integer",
      },
    },
    deletedVariantIds: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    payload: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    versionKey: false,
  },
);

catalogChangeSchema.index({ productId: 1, sequence: 1 });
catalogChangeSchema.index({ occurredAt: 1, sequence: 1 });

const CatalogChange =
  mongoose.models.CatalogChange ||
  model("CatalogChange", catalogChangeSchema);

type CreateCatalogChangeInput = {
  kind: "upsert" | "delete";
  productId: Types.ObjectId | string;
  catalogRevision?: number | null;
  inventoryVersion?: number | null;
  deletedVariantIds?: Array<Types.ObjectId | string>;
  payload?: unknown;
  schemaVersion?: number;
};

export async function createCatalogChange(
  input: CreateCatalogChangeInput,
  session: ClientSession,
) {
  const sequence = await allocateCatalogChangeSequence(session);
  const [change] = await CatalogChange.create(
    [
      {
        ...input,
        sequence,
      },
    ],
    { session },
  );

  return change;
}

export function createProductDeletionCatalogChange(
  productId: Types.ObjectId | string,
  catalogRevision: number,
  session: ClientSession,
) {
  return createCatalogChange(
    {
      kind: "delete",
      productId,
      catalogRevision,
      schemaVersion: 1,
    },
    session,
  );
}

export default CatalogChange;
