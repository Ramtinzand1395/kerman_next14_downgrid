import mongoose from "mongoose";

const BusinessSmsEventSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, unique: true, trim: true, maxlength: 180 },
    eventType: { type: String, required: true, trim: true, maxlength: 80 },
    entityType: { type: String, required: true, trim: true, maxlength: 80 },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    bodyId: { type: Number, default: null },
    destination: { type: String, required: true, select: false },
    args: { type: [String], default: [], select: false },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    attemptedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    providerStatus: { type: Number, default: null },
    errorCode: { type: String, default: null, maxlength: 80 },
  },
  { timestamps: true },
);

BusinessSmsEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.models.BusinessSmsEvent ||
  mongoose.model("BusinessSmsEvent", BusinessSmsEventSchema);
