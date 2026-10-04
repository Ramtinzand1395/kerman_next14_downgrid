// lib/loyalty/coupon.service.ts
// اعتبارسنجی و اعمال کوپن:
// - بررسی همه محدودیت‌ها: فعال بودن، تاریخ، حداقل خرید، محصول/دسته، سقف استفاده کلی و به‌ازای کاربر، کوپن خصوصی.
// - اعمال با افزایش اتمیک usedCount + ثبت CouponUsage.
// - release برای لغو سفارش (برگشت سهم استفاده).
import mongoose from "mongoose";
import Coupon, { ICoupon } from "@/model/Loyalty Club/Coupon";
import CouponUsage from "@/model/Loyalty Club/CouponUsage";
import { computeCouponDiscount, eligibleCouponAmount } from "./coupon.policy";

export interface ValidateCouponInput {
  code: string;
  userId: string;
  /** مبلغ کل سبد قبل از تخفیف (تومان) */
  orderAmount: number;
  /** محصولات سبد برای بررسی محدودیت محصول/دسته */
  items?: { productId: string; categoryIds?: string[]; amount: number }[];
}

export interface CouponValidation {
  ok: boolean;
  error?: string;
  coupon?: mongoose.HydratedDocument<ICoupon> | null;
  discountAmount?: number;
}

export function computeDiscount(
  coupon: Pick<ICoupon, "type" | "value" | "maxDiscountAmount">,
  orderAmount: number,
): number {
  return computeCouponDiscount({
    type: coupon.type,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount,
    eligibleAmount: orderAmount,
  });
}

export async function validateCoupon(
  input: ValidateCouponInput,
): Promise<CouponValidation> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "کد تخفیف را وارد کنید" };

  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.isActive)
    return { ok: false, error: "کد تخفیف معتبر نیست" };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, error: "این کد هنوز فعال نشده است" };
  if (coupon.expiresAt && coupon.expiresAt < now)
    return { ok: false, error: "این کد منقضی شده است" };

  // کوپن خصوصی
  if (coupon.scope === "private") {
    // !تغییر با chat
    // const allowed = coupon.allowedUsers.some((u) => u.toString() === input.userId);

    const allowed = coupon.allowedUsers.some(
      (u: mongoose.Types.ObjectId) => u.toString() === input.userId,
    );
    if (!allowed) return { ok: false, error: "این کد برای شما فعال نیست" };
  }

  // حداقل مبلغ خرید
  if (input.orderAmount < coupon.minPurchaseAmount) {
    return {
      ok: false,
      error: `حداقل مبلغ خرید برای این کد ${coupon.minPurchaseAmount.toLocaleString("fa-IR")} تومان است`,
    };
  }

  // سقف استفاده کلی
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است" };
  }

  // سقف استفاده به‌ازای کاربر
  const userUses = await CouponUsage.countDocuments({
    coupon: coupon._id,
    user: input.userId,
    releasedAt: null,
  });
  if (userUses >= coupon.perUserLimit) {
    return { ok: false, error: "شما قبلاً از این کد استفاده کرده‌اید" };
  }

  // محدودیت محصول/دسته
  let eligibleAmount = input.orderAmount;
  if (coupon.products.length || coupon.categories.length) {
    const items = input.items ?? [];
    // !تغییر با chat
    // const productSet = new Set(coupon.products.map((p) => p.toString()));
    // const categorySet = new Set(coupon.categories.map((c) => c.toString()));
    const productSet = new Set<string>(
      coupon.products.map((p: mongoose.Types.ObjectId) => p.toString()),
    );

    const categorySet = new Set<string>(
      coupon.categories.map((c: mongoose.Types.ObjectId) => c.toString()),
    );
    const eligibility = eligibleCouponAmount(
      input.orderAmount,
      items,
      [...productSet],
      [...categorySet],
    );
    if (!eligibility.matches)
      return {
        ok: false,
        error: "این کد برای محصولات سبد شما قابل استفاده نیست",
      };
    eligibleAmount = eligibility.amount;
  }

  return {
    ok: true,
    coupon,
    discountAmount: computeDiscount(coupon, eligibleAmount),
  };
}

/**
 * اعمال کوپن روی سفارش — با افزایش اتمیک usedCount تحت شرط ظرفیت.
 * باید بعد از موفقیت پرداخت/ثبت قطعی سفارش صدا زده شود.
 */
export async function applyCoupon(input: {
  code: string;
  userId: string;
  orderId: string;
  orderAmount: number;
  items?: { productId: string; categoryIds?: string[]; amount: number }[];
}): Promise<CouponValidation> {
  const validation = await validateCoupon(input);
  if (!validation.ok || !validation.coupon) return validation;

  await CouponUsage.init();
  const existingUsage = await CouponUsage.findOne({ order: input.orderId, releasedAt: null }).lean();
  if (existingUsage) {
    return {
      ok: true,
      coupon: validation.coupon,
      discountAmount: existingUsage.discountAmount,
    };
  }

  let usage: mongoose.HydratedDocument<{
    coupon: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    discountAmount: number;
    usageSlot: number;
    releasedAt?: Date | null;
  }> | null = null;
  for (let usageSlot = 1; usageSlot <= validation.coupon.perUserLimit; usageSlot += 1) {
    try {
      usage = await CouponUsage.create({
        coupon: validation.coupon._id,
        user: input.userId,
        order: input.orderId,
        discountAmount: validation.discountAmount!,
        usageSlot,
      });
      break;
    } catch (err) {
      if ((err as { code?: number })?.code !== 11000) throw err;
      const replay = await CouponUsage.findOne({ order: input.orderId, releasedAt: null }).lean();
      if (replay) {
        return { ok: true, coupon: validation.coupon, discountAmount: replay.discountAmount };
      }
    }
  }
  if (!usage) return { ok: false, error: "سقف استفاده شما از این کد تکمیل شده است" };

  // افزایش اتمیک با شرط ظرفیت کلی
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: validation.coupon._id,
      isActive: true,
      ...(validation.coupon.usageLimit
        ? { usedCount: { $lt: validation.coupon.usageLimit } }
        : {}),
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );
  if (!updated) {
    await CouponUsage.updateOne({ _id: usage._id, releasedAt: null }, { $set: { releasedAt: new Date() } });
    return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است" };
  }

  return {
    ok: true,
    coupon: updated,
    discountAmount: validation.discountAmount,
  };
}

/** آزادسازی کوپن هنگام لغو سفارش */
export async function releaseCoupon(orderId: string): Promise<void> {
  const usage = await CouponUsage.findOneAndUpdate(
    { order: orderId, releasedAt: null },
    { $set: { releasedAt: new Date() } },
    { returnDocument: "before" },
  );
  if (!usage) return;
  await Coupon.updateOne({ _id: usage.coupon, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
