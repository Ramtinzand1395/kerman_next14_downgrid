import mongoose, { Schema, model } from "mongoose";

const gallerySyncJobSchema = new Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    action: { type: String, enum: ["upsert", "delete"], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "retry"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    revision: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    lastErrorCode: { type: String, default: null },
  },
  { timestamps: true, collection: "gallery_sync_jobs" },
);

gallerySyncJobSchema.index({ status: 1, nextAttemptAt: 1 });
gallerySyncJobSchema.index({ status: 1, lockedAt: 1 });

export default
  mongoose.models.GallerySyncJob || model("GallerySyncJob", gallerySyncJobSchema);
