import mongoose, { Schema, model } from "mongoose";

export type InventoryOperationReplayDecision = "replay" | "conflict";

export function classifyInventoryOperationReplay(
  storedRequestHash: string,
  incomingRequestHash: string,
): InventoryOperationReplayDecision {
  return storedRequestHash === incomingRequestHash ? "replay" : "conflict";
}

const positiveSafeInteger = {
  validator: (value: unknown) =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0,
  message: "Value must be a positive safe integer",
};

const inventoryOperationSchema = new Schema(
  {
    operationId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[0-9a-f]{64}$/,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["received", "applied", "rejected", "conflict"],
      required: true,
      default: "received",
      index: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
      validate: positiveSafeInteger,
    },
  },
  {
    versionKey: false,
  },
);

inventoryOperationSchema.index({ deviceId: 1, createdAt: 1 });

export default
  mongoose.models.InventoryOperation ||
  model("InventoryOperation", inventoryOperationSchema);
