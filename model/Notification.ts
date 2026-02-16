// model/Notification.ts
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    title: String,
    message: String,
    type: {
      type: String,
     enum: ["order", "comment", "user", "payment", "contact"],
    },
    isRead: { type: Boolean, default: false },
    target: {
      kind: {
        type: String,
         enum: ["Product", "Order", "Comment", "User", "ContactMessage"],
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
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
