// model/CouponUsage.ts
// ثبت هر استفاده از کوپن — یکتایی (coupon, user, order) جلوی استفاده تکراری در یک سفارش را می‌گیرد.
import mongoose, { Schema, model, Document } from "mongoose";

export interface ICouponUsage extends Document {
  coupon: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  /** مبلغ تخفیف اعمال‌شده (تومان) */
  discountAmount: number;
  createdAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    discountAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CouponUsageSchema.index({ coupon: 1, user: 1 });
CouponUsageSchema.index({ order: 1 });

const CouponUsage =
  mongoose.models.CouponUsage ||
  model<ICouponUsage>("CouponUsage", CouponUsageSchema);
export default CouponUsage;
