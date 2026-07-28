import mongoose, { Schema, model, Document } from "mongoose";
import { VIP_TIERS, VipTier } from "@/types/loyalty";

// تعریف interface TypeScript
export interface IUser extends Document {
  username?: string;
  email?: string;
  mobile: string;
  role: string;
  newsletter: boolean;
  gender?: string;
  birthday?: Date;
  nationalCode?: string;
  favorites: mongoose.Types.ObjectId[];
  addresses: mongoose.Types.ObjectId[];
  orders: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  tempPayments: mongoose.Types.ObjectId[];
  // ---- باشگاه مشتریان ----
  /** کد دعوت اختصاصی کاربر (یکتا) */
  referralCode: string;
  /** سطح VIP فعلی */
  vipTier?: VipTier;
  /** مجموع خرید موفق (تومان) — مبنای ارتقای VIP */
  totalPurchase: number;
  /** تعداد سفارش‌های موفق */
  successfulOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

// تعریف Schema
const UserSchema = new Schema<IUser>(
  {
    username: { type: String, default: "کاربر", required: true },
    email: { type: String, sparse: true },
    mobile: { type: String, unique: true, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    newsletter: { type: Boolean, default: false },
    gender: { type: String },
    birthday: { type: Date },
    nationalCode: { type: String },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
    addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Address" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    tempPayments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "TempPayment" },
    ],
    // ---- باشگاه مشتریان ----
    referralCode: { type: String, unique: true, sparse: true, index: true },
    vipTier: { type: String, enum: VIP_TIERS },
    totalPurchase: { type: Number, default: 0, min: 0 },
    successfulOrders: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true, // ایجاد خودکار createdAt و updatedAt
  }
);

// Export مدل
const User = mongoose.models.User || model<IUser>("User", UserSchema);
export default User;
