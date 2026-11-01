import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/model/Loyalty Club/Coupon";
import { WALL_ART_COUPON_CODE } from "@/lib/campaigns/wall-art";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await dbConnect();
    const now = new Date();
    const coupon = await Coupon.findOne({
      code: WALL_ART_COUPON_CODE,
      isActive: true,
      type: "percent",
      scope: "public",
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
    }).select("code title value expiresAt usageLimit usedCount").lean();

    if (!coupon || (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)) {
      return NextResponse.json({ campaign: null }, { headers });
    }

    return NextResponse.json({
      campaign: {
        code: coupon.code,
        title: coupon.title,
        percent: coupon.value,
        expiresAt: new Date(coupon.expiresAt!).toISOString(),
      },
    }, { headers });
  } catch {
    // A promotion must never block browsing or advertise an unverified offer.
    return NextResponse.json({ campaign: null }, { headers, status: 503 });
  }
}
