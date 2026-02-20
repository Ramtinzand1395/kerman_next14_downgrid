import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import PointsTransaction from "@/model/PointsTransaction";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const points = await PointsTransaction.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("kind status points source note createdAt")
    .lean();

  return NextResponse.json({
    ok: true,
    data: {
      wallet: [],
      points: points.map((item) => ({
        _id: String(item._id),
        type: item.kind,
        status: item.status,
        points: item.points,
        source: item.source,
        note: item.note,
        createdAt: item.createdAt,
      })),
    },
  });
}
