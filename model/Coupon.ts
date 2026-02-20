// !todo
// 10) مدل Coupon (اگر سیستم کوپن مستقل می‌خوای)

// اگر الان کوپن نداری، می‌تونی از RewardRedemption.couponCode استفاده کنی و این رو فعلاً نسازی.
// ولی اگر می‌خوای کوپن‌های عمومی + اختصاصی داشته باشی، این مدل عالیه:
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const CouponStatus = ["ACTIVE", "DISABLED", "EXPIRED"] as const;
export type CouponStatus = (typeof CouponStatus)[number];

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: CouponStatus,
      default: "ACTIVE",
      index: true,
    },

    // اختصاصی برای یک کاربر (برای کوپن‌های پاداش)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    percent: { type: Number, default: null }, // مثلا 10
    amountToman: { type: Number, default: null }, // تخفیف ثابت
    maxDiscountToman: { type: Number, default: null },
    minOrderToman: { type: Number, default: null },

    expiresAt: { type: Date, default: null, index: true },

    usedAt: { type: Date, default: null },
    usedOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true, versionKey: false },
);

CouponSchema.index({ status: 1, expiresAt: 1 });

export type CouponDoc = InferSchemaType<typeof CouponSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Coupon =
  (mongoose.models.Coupon as Model<CouponDoc>) ||
  mongoose.model<CouponDoc>("Coupon", CouponSchema);

export default Coupon;
