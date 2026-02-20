// import mongoose, { Schema, model, Document } from "mongoose";
//  import { generateUniqueReferralCodeWithModel } from "@/lib/referralCode";

// // تعریف interface TypeScript
// export interface IUser extends Document {
//   username?: string;
//   email?: string;
//   mobile: string;
//   role: string;
//   newsletter: boolean;
//   gender?: string;
//   birthday?: Date;
//   nationalCode?: string;
//   favorites: mongoose.Types.ObjectId[];
//   addresses: mongoose.Types.ObjectId[];
//   orders: mongoose.Types.ObjectId[];
//   comments: mongoose.Types.ObjectId[];
//   tempPayments: mongoose.Types.ObjectId[];
//   createdAt: Date;
//   updatedAt: Date;
//   // ✅ Loyalty additions
//   referralCode: string;
//   referredBy?: mongoose.Types.ObjectId | null;
//   loyalty?: {
//     pointsBalanceCached: number;
//     lastRecalcAt?: Date | null;
//   };
// }

// // تعریف Schema
// const UserSchema = new Schema<IUser>(
//   {
//     username: { type: String, default: "کاربر", required: true },
//     email: { type: String, sparse: true },
//     mobile: { type: String, unique: true, required: true },
//     role: {
//       type: String,
//       enum: ["user", "admin", "superadmin"],
//       default: "user",
//     },
//     newsletter: { type: Boolean, default: false },
//     gender: { type: String },
//     birthday: { type: Date },
//     nationalCode: { type: String },
//     favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
//     addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Address" }],
//     orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
//     comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
//     tempPayments: [
//       { type: mongoose.Schema.Types.ObjectId, ref: "TempPayment" },
//     ],
//   },
//   {
//     timestamps: true, // ایجاد خودکار createdAt و updatedAt
//   },
// );

// // اگر referralCode خالی بود، خودکار بساز

// UserSchema.pre("validate", async function (next) {
//   try {
//     // @ts-ignore
//     if (!this.referralCode) {
//       const UserModel = mongoose.models.User || mongoose.model("User");
//       // @ts-ignore
//       this.referralCode = await generateUniqueReferralCodeWithModel(UserModel, "KA", 6);
//     }
//     next();
//   } catch (err) {
//     next(err as any);
//   }
// });
// // Export مدل
// const User = mongoose.models.User || model<IUser>("User", UserSchema);
// export default User;

import mongoose, { Document, model, Schema } from "mongoose";
 import { generateUniqueReferralCodeWithModel } from "@/lib/referralCode";
 
export interface IUser extends Document {
  username: string;
  email?: string;
  mobile: string;
  role: "user" | "admin" | "superadmin";
  newsletter?: boolean;
  gender?: string;
  birthday?: Date;
  nationalCode?: string;
  favorites: mongoose.Types.ObjectId[];
  addresses: mongoose.Types.ObjectId[];
  orders: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  tempPayments: mongoose.Types.ObjectId[];
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId | null;
  loyalty?: {
    pointsBalanceCached: number;
    lastRecalcAt: Date | null;
  };
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
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    loyalty: {
      pointsBalanceCached: { type: Number, default: 0 },
      lastRecalcAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true, // ایجاد خودکار createdAt و updatedAt
  },
);

// اگر referralCode خالی بود، خودکار بساز
UserSchema.pre("validate", async function () {
  // @ts-ignore
  if (!this.referralCode) {
    const UserModel = mongoose.models.User || mongoose.model("User");
    // @ts-ignore
    this.referralCode = await generateUniqueReferralCodeWithModel(
      UserModel,
      "KA",
      6,
    );
  }
});

// Export مدل
const User = mongoose.models.User || model<IUser>("User", UserSchema);
export default User;