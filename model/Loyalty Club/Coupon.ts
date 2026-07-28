// // model/Coupon.ts
// // کوپن تخفیف — عمومی/خصوصی، درصدی/مبلغ ثابت، با محدودیت‌های استفاده، تاریخ، محصول و دسته‌بندی.
// import mongoose, { Schema, model, Document } from "mongoose";
// import { COUPON_TYPES, COUPON_SCOPES, CouponType, CouponScope } from "@/types/loyalty";

// export interface ICoupon extends Document {
//   code: string;
//   title?: string;
//   type: CouponType;
//   /** درصد (۱ تا ۱۰۰) یا مبلغ ثابت (تومان) */
//   value: number;
//   scope: CouponScope;
//   /** برای کوپن خصوصی: کاربران مجاز */
//   allowedUsers: mongoose.Types.ObjectId[];
//   /** سقف مبلغ تخفیف برای کوپن درصدی (تومان) */
//   maxDiscountAmount?: number;
//   /** حداقل مبلغ سفارش */
//   minPurchaseAmount: number;
//   /** محدودیت کلی تعداد استفاده (null = نامحدود) */
//   usageLimit?: number;
//   /** محدودیت استفاده به ازای هر کاربر */
//   perUserLimit: number;
//   /** تعداد استفاده فعلی (شمارنده اتمیک) */
//   usedCount: number;
//   /** محدودیت به محصولات خاص (خالی = همه) */
//   products: mongoose.Types.ObjectId[];
//   /** محدودیت به دسته‌بندی‌های خاص (خالی = همه) */
//   categories: mongoose.Types.ObjectId[];
//   startsAt?: Date;
//   expiresAt?: Date;
//   isActive: boolean;
//   createdBy?: mongoose.Types.ObjectId;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const CouponSchema = new Schema<ICoupon>(
//   {
//     code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
//     title: String,
//     type: { type: String, enum: COUPON_TYPES, required: true },
//     value: { type: Number, required: true, min: 0 },
//     scope: { type: String, enum: COUPON_SCOPES, default: "public" },
//     allowedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
//     maxDiscountAmount: { type: Number, min: 0 },
//     minPurchaseAmount: { type: Number, default: 0, min: 0 },
//     usageLimit: { type: Number, min: 1 },
//     perUserLimit: { type: Number, default: 1, min: 1 },
//     usedCount: { type: Number, default: 0, min: 0 },
//     products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
//     categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
//     startsAt: Date,
//     expiresAt: { type: Date, index: true },
//     isActive: { type: Boolean, default: true, index: true },
//     createdBy: { type: Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true },
// );

// const Coupon = mongoose.models.Coupon || model<ICoupon>("Coupon", CouponSchema);
// export default Coupon;

// !تغییر با chat
// model/Coupon.ts
// کوپن تخفیف — عمومی/خصوصی، درصدی/مبلغ ثابت، با محدودیت‌های استفاده، تاریخ، محصول و دسته‌بندی.

import mongoose, { Schema, model, models, HydratedDocument } from "mongoose";

import {
  COUPON_TYPES,
  COUPON_SCOPES,
  CouponType,
  CouponScope,
} from "@/types/loyalty";

export interface ICoupon {
  code: string;

  title?: string;

  type: CouponType;

  /**
   * درصد یا مبلغ ثابت
   */
  value: number;

  scope: CouponScope;

  /**
   * کاربران مجاز برای کوپن خصوصی
   */
  allowedUsers: mongoose.Types.ObjectId[];

  /**
   * سقف تخفیف درصدی
   */
  maxDiscountAmount?: number;

  /**
   * حداقل مبلغ خرید
   */
  minPurchaseAmount: number;

  /**
   * محدودیت کل استفاده
   */
  usageLimit?: number;

  /**
   * محدودیت هر کاربر
   */
  perUserLimit: number;

  /**
   * تعداد استفاده شده
   */
  usedCount: number;

  /**
   * محصولات محدود
   */
  products: mongoose.Types.ObjectId[];

  /**
   * دسته بندی محدود
   */
  categories: mongoose.Types.ObjectId[];

  startsAt?: Date | null;

  expiresAt?: Date | null;

  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

export type CouponDocument = HydratedDocument<ICoupon>;

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: COUPON_TYPES,
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    scope: {
      type: String,
      enum: COUPON_SCOPES,
      default: "public",
    },

    allowedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null,
    },

    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },

  {
    timestamps: true,
  },
);

// برای validate سریع‌تر کوپن‌ها

CouponSchema.index({
  code: 1,
  isActive: 1,
});

CouponSchema.index({
  isActive: 1,
  expiresAt: 1,
});

const Coupon = models.Coupon || model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
