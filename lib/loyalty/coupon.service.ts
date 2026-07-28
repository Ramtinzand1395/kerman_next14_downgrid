// lib/loyalty/coupon.service.ts
// اعتبارسنجی و اعمال کوپن:
// - بررسی همه محدودیت‌ها: فعال بودن، تاریخ، حداقل خرید، محصول/دسته، سقف استفاده کلی و به‌ازای کاربر، کوپن خصوصی.
// - اعمال با افزایش اتمیک usedCount + ثبت CouponUsage.
// - release برای لغو سفارش (برگشت سهم استفاده).
import mongoose from "mongoose";
import Coupon, { ICoupon } from "@/model/Loyalty Club/Coupon";
import CouponUsage from "@/model/Loyalty Club/CouponUsage";

export interface ValidateCouponInput {
  code: string;
  userId: string;
  /** مبلغ کل سبد قبل از تخفیف (تومان) */
  orderAmount: number;
  /** محصولات سبد برای بررسی محدودیت محصول/دسته */
  items?: { productId: string; categoryIds?: string[] }[];
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
  let discount =
    coupon.type === "percent"
      ? Math.floor((orderAmount * coupon.value) / 100)
      : Math.round(coupon.value);
  if (coupon.type === "percent" && coupon.maxDiscountAmount) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  return Math.max(0, Math.min(discount, orderAmount));
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
  });
  if (userUses >= coupon.perUserLimit) {
    return { ok: false, error: "شما قبلاً از این کد استفاده کرده‌اید" };
  }

  // محدودیت محصول/دسته
  if (coupon.products.length || coupon.categories.length) {
    const items = input.items ?? [];
    // !تغییر با chat
    // const productSet = new Set(coupon.products.map((p) => p.toString()));
    // const categorySet = new Set(coupon.categories.map((c) => c.toString()));
    const productSet = new Set(
      coupon.products.map((p: mongoose.Types.ObjectId) => p.toString()),
    );

    const categorySet = new Set(
      coupon.categories.map((c: mongoose.Types.ObjectId) => c.toString()),
    );
    const matches = items.some(
      (it) =>
        productSet.has(it.productId) ||
        (it.categoryIds ?? []).some((c) => categorySet.has(c)),
    );
    if (!matches)
      return {
        ok: false,
        error: "این کد برای محصولات سبد شما قابل استفاده نیست",
      };
  }

  return {
    ok: true,
    coupon,
    discountAmount: computeDiscount(coupon, input.orderAmount),
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
  items?: { productId: string; categoryIds?: string[] }[];
}): Promise<CouponValidation> {
  const validation = await validateCoupon(input);
  if (!validation.ok || !validation.coupon) return validation;

  // افزایش اتمیک با شرط ظرفیت — جلوی رقابت هم‌زمان
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: validation.coupon._id,
      isActive: true,
      ...(validation.coupon.usageLimit
        ? { usedCount: { $lt: validation.coupon.usageLimit } }
        : {}),
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );
  if (!updated)
    return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است" };

  try {
    await CouponUsage.create({
      coupon: updated._id,
      user: input.userId,
      order: input.orderId,
      discountAmount: validation.discountAmount!,
    });
  } catch (err) {
    // اگر ثبت usage شکست خورد، شمارنده را برگردان
    await Coupon.updateOne({ _id: updated._id }, { $inc: { usedCount: -1 } });
    if ((err as { code?: number })?.code === 11000) {
      return { ok: false, error: "این کد قبلاً برای این سفارش اعمال شده است" };
    }
    throw err;
  }

  return {
    ok: true,
    coupon: updated,
    discountAmount: validation.discountAmount,
  };
}

/** آزادسازی کوپن هنگام لغو سفارش */
export async function releaseCoupon(orderId: string): Promise<void> {
  const usage = await CouponUsage.findOne({ order: orderId });
  if (!usage) return;
  await Coupon.updateOne({ _id: usage.coupon }, { $inc: { usedCount: -1 } });
  await usage.deleteOne();
}
