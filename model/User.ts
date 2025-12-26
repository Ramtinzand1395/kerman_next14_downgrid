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
  products: mongoose.Types.ObjectId[];
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
    newsletter: { type: Boolean, default: true },
    gender: { type: String },
    birthday: { type: Date },
    nationalCode: { type: String },
    // رفرنس‌ها به سایر Collectionها
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
    addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Address" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
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

// import mongoose, { Schema, model, Document } from "mongoose";
// import moment from "moment-jalaali";

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
//   products: mongoose.Types.ObjectId[];
//   comments: mongoose.Types.ObjectId[];
//   tempPayments: mongoose.Types.ObjectId[];
//   createdAt: Date;
//   updatedAt: Date;
//   // متد کمکی برای نمایش تاریخ شمسی
//   getJalaliDates?: () => {
//     birthday?: string;
//     createdAt: string;
//     updatedAt: string;
//   };
// }

// // تعریف Schema
// const UserSchema = new Schema<IUser>(
//   {
//     username: { type: String, default: "کاربر", required: true },
//     email: { type: String, sparse: true },
//     mobile: { type: String, unique: true, required: true },
//     role: { type: String, default: "user" },
//     newsletter: { type: Boolean, default: true },
//     gender: { type: String },
//     birthday: { type: Date },
//     nationalCode: { type: String },
//     favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
//     addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Address" }],
//     orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
//     products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
//     comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
//     tempPayments: [
//       { type: mongoose.Schema.Types.ObjectId, ref: "TempPayment" },
//     ],
//   },
//   {
//     timestamps: true,
//   }
// );

// // متد instance برای تبدیل تاریخ‌ها به شمسی
// UserSchema.methods.getJalaliDates = function () {
//   return {
//     birthday: this.birthday
//       ? moment(this.birthday).locale("fa").format("jYYYY/jMM/jDD")
//       : undefined,
//     createdAt: moment(this.createdAt)
//       .locale("fa")
//       .format("jYYYY/jMM/jDD HH:mm"),
//     updatedAt: moment(this.updatedAt)
//       .locale("fa")
//       .format("jYYYY/jMM/jDD HH:mm"),
//   };
// };

// // Export مدل
// const User = mongoose.models.User || model<IUser>("User", UserSchema);
// export default User;
