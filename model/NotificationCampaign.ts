import mongoose from "mongoose";
import { NOTIFICATION_PRIORITIES } from "@/lib/notifications/constants";

const NotificationCampaignSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 160 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    link: { type: String, default: null, trim: true, maxlength: 1000 },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: "normal" },
    audience: {
      kind: {
        type: String,
        enum: ["selected", "all_users", "product_buyers", "category_buyers", "active_orders"],
        required: true,
      },
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
      categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
      label: { type: String, trim: true, maxlength: 240 },
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "queued", "processing", "completed", "cancelled"],
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, default: null, index: true },
    requestedMode: { type: String, enum: ["draft", "send"], required: true },
    recipientsMaterializedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    recipientCount: { type: Number, default: 0, min: 0 },
    manualRetryCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

NotificationCampaignSchema.index({ createdBy: 1, idempotencyKey: 1 }, { unique: true });
NotificationCampaignSchema.index({ status: 1, scheduledAt: 1, createdAt: 1 });

export default mongoose.models.NotificationCampaign ||
  mongoose.model("NotificationCampaign", NotificationCampaignSchema);
