// models/PrintQueue.ts

import mongoose from "mongoose";

const printQueueSchema = new mongoose.Schema(
  {
    payload: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "printing", "done"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.PrintQueue ||
  mongoose.model("PrintQueue", printQueueSchema);
