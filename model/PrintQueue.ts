// models/PrintQueue.ts

import mongoose, { Schema } from "mongoose";

const printQueueSchema = new mongoose.Schema(
  {
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedConsumerId: {
      type: String,
      default: null,
      maxlength: 160,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      index: true,
    },
    assignedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

printQueueSchema.index({ assignedConsumerId: 1, status: 1, createdAt: 1 });

export default mongoose.models.PrintQueue ||
  mongoose.model("PrintQueue", printQueueSchema);
