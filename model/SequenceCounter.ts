import mongoose, { Schema, model } from "mongoose";
import type { ClientSession } from "mongoose";

export const CATALOG_CHANGE_COUNTER_ID = "catalog-change";

const sequenceCounterSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: (value: unknown) =>
          typeof value === "number" &&
          Number.isSafeInteger(value) &&
          value >= 0,
        message: "Sequence counter must be a non-negative safe integer",
      },
    },
  },
  {
    versionKey: false,
  },
);

const SequenceCounter =
  mongoose.models.SequenceCounter ||
  model("SequenceCounter", sequenceCounterSchema);

export async function allocateCatalogChangeSequence(
  session: ClientSession,
): Promise<number> {
  if (!session.inTransaction()) {
    throw new Error(
      "CatalogChange sequence allocation requires an active transaction",
    );
  }

  const counter = await SequenceCounter.findOneAndUpdate(
    { _id: CATALOG_CHANGE_COUNTER_ID },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  );

  if (!counter || !Number.isSafeInteger(counter.value) || counter.value <= 0) {
    throw new Error("CatalogChange sequence overflow or allocation failure");
  }

  return counter.value;
}

export default SequenceCounter;
