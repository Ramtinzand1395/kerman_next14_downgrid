import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import PromotionModal from "@/model/PromotionModal";
import "@/model/Loyalty Club/Coupon";
import type { ICoupon } from "@/model/Loyalty Club/Coupon";
import CouponUsage from "@/model/Loyalty Club/CouponUsage";
import { canShowCoupon, type PromotionOffer } from "@/lib/promotions/policy";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const modals = await PromotionModal.find({ isActive: true, deletedAt: null })
      .sort({ priority: -1, createdAt: -1 }).limit(100)
      .populate<{ coupon: (ICoupon & { _id: Types.ObjectId }) | null }>("coupon").lean();
    const used = userId ? await CouponUsage.distinct("coupon", {
      user: userId, coupon: { $in: modals.flatMap((m) => m.coupon ? [m.coupon._id] : []) },
      releasedAt: null,
    }) : [];
    const usedIds = new Set(used.map(String));
    let promotion: PromotionOffer | null = null;
    for (const modal of modals) {
      const coupon = modal.coupon;
      if (!coupon || !canShowCoupon({ ...coupon, allowedUsers: coupon.allowedUsers.map(String) },
        userId, usedIds.has(String(coupon._id)))) continue;
      const conditions = ["کد رو کپی کن و موقع پرداخت، تخفیفت رو بگیر."];
      if (coupon.minPurchaseAmount) conditions.push(`حداقل خرید: ${coupon.minPurchaseAmount.toLocaleString("fa-IR")} تومان.`);
      if (coupon.maxDiscountAmount) conditions.push(`سقف تخفیف: ${coupon.maxDiscountAmount.toLocaleString("fa-IR")} تومان.`);
      promotion = {
        id: String(modal._id), title: modal.title, body: modal.body,
        ctaLabel: modal.ctaLabel, ctaHref: modal.ctaHref, dismissLabel: modal.dismissLabel,
        code: coupon.code,
        discountLabel: coupon.type === "percent" ? `${coupon.value.toLocaleString("fa-IR")}٪ تخفیف` : `${coupon.value.toLocaleString("fa-IR")} تومان تخفیف`,
        conditions, expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString() : null,
      };
      break;
    }
    return NextResponse.json({ promotion }, { headers });
  } catch {
    return NextResponse.json({ promotion: null }, { status: 503, headers });
  }
}
