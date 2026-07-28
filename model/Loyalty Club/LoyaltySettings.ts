// model/LoyaltySettings.ts
// تنظیمات سراسری باشگاه مشتریان — یک رکورد singleton که از پنل مدیریت قابل ویرایش است.
// شامل: مقادیر XP هر فعالیت، درصد کش‌بک پیش‌فرض، پاداش رفرال، پاداش زنجیره ورود، تنظیمات گردونه.
import mongoose, { Schema, model, Document } from "mongoose";

export interface ILoyaltySettings extends Document {
  /** کلید singleton — همیشه "global" */
  key: string;
  xp: {
    signup: number;
    firstPurchase: number;
    /** XP به ازای هر ۱۰٬۰۰۰ تومان خرید */
    purchasePer10k: number;
    review: number;
    consecutivePurchase: number;
    referral: number;
    dailyLogin: number;
    campaignParticipation: number;
  };
  cashback: {
    /** درصد پیش‌فرض وقتی هیچ قاعده‌ای منطبق نشد */
    defaultPercent: number;
    enabled: boolean;
  };
  referral: {
    /** پاداش معرف بعد از اولین خرید دعوت‌شده (تومان) */
    referrerReward: number;
    /** هدیه کاربر جدید (تومان) */
    refereeReward: number;
    /** حداقل مبلغ اولین خرید برای فعال شدن پاداش */
    minFirstPurchase: number;
  };
  loginStreak: {
    /** پاداش XP روز nام زنجیره — ایندکس ۰ = روز اول */
    dailyXpRewards: number[];
    /** پاداش اعتبار کیف پول در روز هفتم (تومان) */
    daySevenWalletReward: number;
  };
  spin: {
    enabled: boolean;
    /** هزینه چرخش اضافه (تومان) — ۰ = غیرفعال */
    extraSpinCost: number;
  };
  wallet: {
    /** حداقل مبلغ شارژ */
    minCharge: number;
    /** حداکثر مبلغ شارژ */
    maxCharge: number;
    /** مدت اعتبار هدیه‌ها به روز (۰ = بدون انقضا) */
    giftExpiryDays: number;
  };
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltySettingsSchema = new Schema<ILoyaltySettings>(
  {
    key: { type: String, default: "global", unique: true },
    xp: {
      _id: false,
      signup: { type: Number, default: 100 },
      firstPurchase: { type: Number, default: 200 },
      purchasePer10k: { type: Number, default: 10 },
      review: { type: Number, default: 50 },
      consecutivePurchase: { type: Number, default: 30 },
      referral: { type: Number, default: 150 },
      dailyLogin: { type: Number, default: 10 },
      campaignParticipation: { type: Number, default: 100 },
    },
    cashback: {
      _id: false,
      defaultPercent: { type: Number, default: 2, min: 0, max: 100 },
      enabled: { type: Boolean, default: true },
    },
    referral: {
      _id: false,
      referrerReward: { type: Number, default: 50000 },
      refereeReward: { type: Number, default: 25000 },
      minFirstPurchase: { type: Number, default: 100000 },
    },
    loginStreak: {
      _id: false,
      dailyXpRewards: { type: [Number], default: [10, 15, 20, 25, 30, 40, 60] },
      daySevenWalletReward: { type: Number, default: 10000 },
    },
    spin: {
      _id: false,
      enabled: { type: Boolean, default: true },
      extraSpinCost: { type: Number, default: 0 },
    },
    wallet: {
      _id: false,
      minCharge: { type: Number, default: 10000 },
      maxCharge: { type: Number, default: 50000000 },
      giftExpiryDays: { type: Number, default: 90 },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const LoyaltySettings =
  mongoose.models.LoyaltySettings ||
  model<ILoyaltySettings>("LoyaltySettings", LoyaltySettingsSchema);
export default LoyaltySettings;
