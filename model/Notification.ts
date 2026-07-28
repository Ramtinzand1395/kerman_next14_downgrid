// model/Notification.ts
import mongoose from "mongoose";
import { LOYALTY_NOTIF_TYPES } from "@/types/loyalty";

const NotificationSchema = new mongoose.Schema(
  {
    title: String,
    message: String,
    type: {
      type: String,
      enum: [
        "order",
        "comment",
        "user",
        "payment",
        "contact",
        "customerGameOrder",
        // ---- انواع اعلان باشگاه مشتریان و کیف پول ----
        ...LOYALTY_NOTIF_TYPES,
      ],
    },
    isRead: { type: Boolean, default: false },
    target: {
      kind: {
        type: String,
        enum: [
          "Product",
          "Order",
          "Comment",
          "User",
          "ContactMessage",
          "CustomerGameOrder",
          // ---- موجودیت‌های باشگاه مشتریان ----
          "WalletTransaction",
          "Mission",
          "Achievement",
          "Coupon",
          "SpinHistory",
        ],
        // برای اعلان‌های ساده باشگاه مشتریان (مثل تغییر Level) target اختیاری است
        required: false,
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
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
