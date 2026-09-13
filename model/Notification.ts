// model/Notification.ts
import mongoose from "mongoose";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SENDER_TYPES,
} from "@/lib/notifications/constants";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    recipientRole: { type: String, trim: true, uppercase: true, index: true },
    type: { type: String, required: true, trim: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, default: "system" },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    link: { type: String, default: null, trim: true, maxlength: 1000 },
    entityType: { type: String, default: null, trim: true, maxlength: 80 },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: "normal" },
    senderType: { type: String, enum: NOTIFICATION_SENDER_TYPES, default: "system" },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    eventKey: { type: String, trim: true, maxlength: 240 },
    deduplicationKey: { type: String, trim: true, maxlength: 360 },

    // فیلدهای قدیمی تا پایان مهاجرت برای سازگاری با اعلان‌های موجود حفظ می‌شوند.
    for: { type: String, enum: ["admin", "user"], required: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    target: {
      kind: { type: String, required: false },
      item: { type: mongoose.Schema.Types.ObjectId, required: false, refPath: "target.kind" },
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index(
  { deduplicationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deduplicationKey: { $type: "string" } },
  },
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
