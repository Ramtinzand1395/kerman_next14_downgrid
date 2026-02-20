import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import User from "@/model/User";
import Referral from "@/model/Referral";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await User.findById(session.user.id)
    .select("referralCode")
    .lean();

  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  const referrals = await Referral.find({ referrerUser: session.user.id })
    .sort({ createdAt: -1 })
    .populate({ path: "referredUser", select: "mobile username" })
    .lean();

  return NextResponse.json({
    ok: true,
    data: {
      referralCode: user.referralCode || null,
      referrals: referrals.map((item: any) => ({
        _id: String(item._id),
        invited: item.referredUser
          ? {
              mobile: item.referredUser.mobile,
              username: item.referredUser.username,
            }
          : null,
        status: item.status,
        inviterReward: item.status === "REWARDED" ? 1 : 0,
      })),
    },
  });
}
