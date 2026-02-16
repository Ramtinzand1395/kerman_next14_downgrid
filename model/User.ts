import mongoose, { Schema, model, Document } from "mongoose";

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
  },
  {
    timestamps: true, // ایجاد خودکار createdAt و updatedAt
  }
);

// Export مدل
const User = mongoose.models.User || model<IUser>("User", UserSchema);
export default User;
