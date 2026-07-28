import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { VipTier } from "@/types/loyalty";

const CashbackRuleSchema = new Schema(
  {
    // عنوان قانون
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // توضیحات
    description: {
      type: String,
      default: "",
    },

    // فعال بودن
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // اولویت (عدد بزرگ‌تر = اولویت بیشتر)
    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    // درصد کش‌بک
    percent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // سقف مبلغ کش‌بک
    maxAmount: {
      type: Number,
      default: null,
    },

    // حداقل مبلغ سفارش
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    // حداکثر مبلغ سفارش (اختیاری)
    maxOrderAmount: {
      type: Number,
      default: null,
    },

    // دسته‌بندی‌های مجاز
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // محصولات خاص
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // فقط برای VIP های خاص
    vipTiers: [
      {
        type: String,
        enum: ["bronze", "silver", "gold", "diamond"] satisfies VipTier[],
      },
    ],

    // فقط اولین خرید
    firstPurchaseOnly: {
      type: Boolean,
      default: false,
    },

    // محدودیت استفاده هر کاربر
    perUserLimit: {
      type: Number,
      default: null,
    },

    // محدودیت کل استفاده
    usageLimit: {
      type: Number,
      default: null,
    },

    // تعداد استفاده شده
    usageCount: {
      type: Number,
      default: 0,
    },

    // زمان شروع
    startsAt: {
      type: Date,
      default: null,
    },

    // زمان پایان
    endsAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

CashbackRuleSchema.index({
  isActive: 1,
  priority: -1,
});

CashbackRuleSchema.index({
  startsAt: 1,
  endsAt: 1,
});

type CashbackRuleType = InferSchemaType<typeof CashbackRuleSchema>;

const CashbackRule: Model<CashbackRuleType> =
  mongoose.models.CashbackRule ||
  mongoose.model<CashbackRuleType>("CashbackRule", CashbackRuleSchema);

export default CashbackRule;
