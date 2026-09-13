import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import User from "@/model/User";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || "";
  const search = query ? new RegExp(escapeRegExp(query), "i") : null;
  await dbConnect();
  const users = await User.find({
    role: "user",
    ...(search ? { $or: [{ username: search }, { mobile: search }, { email: search }] } : {}),
  })
    .select("username mobile email")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ users });
}

