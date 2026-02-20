import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import User from "@/model/User";
import PointsTransaction from "@/model/PointsTransaction";
import Referral from "@/model/Referral";
import Reward from "@/model/Reward";
import RewardRedemption from "@/model/RewardRedemption";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const [
    users,
    pointsSummary,
    referralsByStatus,
    rewardsCount,
    redemptionByStatus,
    recentTransactions,
  ] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("username mobile referralCode referredBy loyalty createdAt"),
    PointsTransaction.aggregate([
      { $match: { status: "CONFIRMED" } },
      {
        $group: {
          _id: "$kind",
          totalPoints: { $sum: "$points" },
          count: { $sum: 1 },
        },
      },
    ]),
    Referral.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Reward.countDocuments({ active: true }),
    RewardRedemption.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    PointsTransaction.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select("user kind status points source createdAt")
      .populate({ path: "user", select: "username mobile" }),
  ]);

  return NextResponse.json({
    users,
    stats: {
      usersWithReferralCode: users.filter((u) => Boolean(u.referralCode)).length,
      usersReferred: users.filter((u) => Boolean(u.referredBy)).length,
      activeRewards: rewardsCount,
      pointsSummary,
      referralsByStatus,
      redemptionByStatus,
    },
    recentTransactions,
  });
}
