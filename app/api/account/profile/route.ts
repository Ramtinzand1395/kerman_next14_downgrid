import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import User from "@/model/User";
import { getAvailablePoints } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await User.findById(session.user.id)
    .select("username email mobile referralCode referredBy loyalty createdAt")
    .lean();

  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  const pointsBalance = await getAvailablePoints(session.user.id);

  await User.updateOne(
    { _id: session.user.id },
    { $set: { "loyalty.pointsBalanceCached": pointsBalance, "loyalty.lastRecalcAt": new Date() } },
  );

  return NextResponse.json({
    ok: true,
    data: {
      ...user,
      pointsBalance,
      tier: pointsBalance >= 1000 ? "gold" : pointsBalance >= 300 ? "silver" : "bronze",
      walletBalance: 0,
    },
  });
}
