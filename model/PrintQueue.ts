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
      enum: ["pending", "delivered", "completed"],
      default: "pending",
      index: true,
    },
    assignedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    deliveryAttemptId: { type: String, default: null },
    deliveryCount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date, default: null },
    recoveryHistory: {
      type: [
        {
          action: {
            type: String,
            enum: ["release_not_printed", "mark_printed"],
            required: true,
          },
          reason: { type: String, required: true, maxlength: 500 },
          actorUserId: { type: String, required: true },
          fromStatus: { type: String, required: true },
          fromConsumerId: { type: String, required: true },
          resolvedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

printQueueSchema.index({ assignedConsumerId: 1, status: 1, createdAt: 1 });

export default mongoose.models.PrintQueue ||
  mongoose.model("PrintQueue", printQueueSchema);
