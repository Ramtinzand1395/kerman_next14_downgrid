// model/Coupon.ts
// کوپن تخفیف — عمومی/خصوصی، درصدی/مبلغ ثابت، با محدودیت‌های استفاده، تاریخ، محصول و دسته‌بندی.
import mongoose, { Schema, model, Document } from "mongoose";
import { COUPON_TYPES, COUPON_SCOPES, CouponType, CouponScope } from "@/types/loyalty";

export interface ICoupon extends Document {
  code: string;
  title?: string;
  type: CouponType;
  /** درصد (۱ تا ۱۰۰) یا مبلغ ثابت (تومان) */
  value: number;
  scope: CouponScope;
  /** برای کوپن خصوصی: کاربران مجاز */
  allowedUsers: mongoose.Types.ObjectId[];
  /** سقف مبلغ تخفیف برای کوپن درصدی (تومان) */
  maxDiscountAmount?: number;
  /** حداقل مبلغ سفارش */
  minPurchaseAmount: number;
  /** محدودیت کلی تعداد استفاده (null = نامحدود) */
  usageLimit?: number;
  /** محدودیت استفاده به ازای هر کاربر */
  perUserLimit: number;
  /** تعداد استفاده فعلی (شمارنده اتمیک) */
  usedCount: number;
  /** محدودیت به محصولات خاص (خالی = همه) */
  products: mongoose.Types.ObjectId[];
  /** محدودیت به دسته‌بندی‌های خاص (خالی = همه) */
  categories: mongoose.Types.ObjectId[];
  startsAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: String,
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: COUPON_SCOPES, default: "public" },
    allowedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    maxDiscountAmount: { type: Number, min: 0 },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, min: 1 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    startsAt: Date,
    expiresAt: { type: Date, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Coupon = mongoose.models.Coupon || model<ICoupon>("Coupon", CouponSchema);
export default Coupon;
