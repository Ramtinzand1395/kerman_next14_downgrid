import mongoose from "mongoose";

const NotificationReceiptSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    readAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationReceiptSchema.index(
  { notificationId: 1, recipientId: 1 },
  { unique: true },
);
NotificationReceiptSchema.index({ recipientId: 1, archivedAt: 1, readAt: 1 });

export default mongoose.models.NotificationReceipt ||
  mongoose.model("NotificationReceipt", NotificationReceiptSchema);
