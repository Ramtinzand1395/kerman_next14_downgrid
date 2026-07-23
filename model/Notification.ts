// model/Notification.ts
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    title: String,
    message: String,
    type: {
      type: String,
     enum: ["order", "comment", "user", "payment", "contact","customerGameOrder"],
    },
    isRead: { type: Boolean, default: false },
    target: {
      kind: {
        type: String,
         enum: ["Product", "Order", "Comment", "User", "ContactMessage","CustomerGameOrder"],
        required: true,
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "target.kind",
      },
    },
    // برای چه کسی؟
    for: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },
     // ارجاع به کاربر مرتبط (برای customerGameOrder بر اساس userId وصل می‌شود)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
