import mongoose from "mongoose";

const NotificationDeliverySchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationCampaign",
      required: true,
      index: true,
    },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: null, index: true },
    leaseToken: { type: String, default: null, index: true },
    leaseExpiresAt: { type: Date, default: null, index: true },
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification", default: null },
    succeededAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true },
);

NotificationDeliverySchema.index({ campaignId: 1, recipientId: 1 }, { unique: true });
NotificationDeliverySchema.index({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });

export default mongoose.models.NotificationDelivery ||
  mongoose.model("NotificationDelivery", NotificationDeliverySchema);
