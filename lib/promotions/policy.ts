export type CouponAudience = {
  isActive: boolean;
  scope: string;
  perUserLimit: number;
  allowedUsers: string[];
  usedCount: number;
  usageLimit?: number | null;
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
};

export function canShowCoupon(
  coupon: CouponAudience,
  userId: string | null,
  alreadyUsed: boolean,
  now = Date.now(),
) {
  if (!coupon.isActive || coupon.perUserLimit !== 1 || alreadyUsed) return false;
  if (coupon.scope === "private" && (!userId || !coupon.allowedUsers.includes(userId))) return false;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
  const start = coupon.startsAt == null ? null : new Date(coupon.startsAt).getTime();
  const end = coupon.expiresAt == null ? null : new Date(coupon.expiresAt).getTime();
  if (start !== null && (!Number.isFinite(start) || start > now)) return false;
  if (end !== null && (!Number.isFinite(end) || end <= now)) return false;
  return true;
}

export type PromotionOffer = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  dismissLabel: string;
  code: string;
  discountLabel: string;
  conditions: string[];
  expiresAt: string | null;
};
