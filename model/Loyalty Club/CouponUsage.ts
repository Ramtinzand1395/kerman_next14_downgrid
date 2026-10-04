// model/CouponUsage.ts
// ثبت هر استفاده از کوپن — یکتایی (coupon, user, order) جلوی استفاده تکراری در یک سفارش را می‌گیرد.
import mongoose, { Schema, model, Document } from "mongoose";

interface ICouponUsage extends Document {
  coupon: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  /** مبلغ تخفیف اعمال‌شده (تومان) */
  discountAmount: number;
  usageSlot: number;
  releasedAt?: Date | null;
  createdAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    usageSlot: { type: Number, required: true, min: 1 },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CouponUsageSchema.index(
  { coupon: 1, user: 1, usageSlot: 1 },
  { unique: true, partialFilterExpression: { releasedAt: null, usageSlot: { $type: "number" } } },
);
CouponUsageSchema.index({ order: 1 }, { unique: true });

const CouponUsage =
  mongoose.models.CouponUsage ||
  model<ICouponUsage>("CouponUsage", CouponUsageSchema);
export default CouponUsage;
