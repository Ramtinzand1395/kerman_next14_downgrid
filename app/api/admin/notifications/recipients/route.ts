import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import User from "@/model/User";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDigits(value: string) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return value
    .normalize("NFKC")
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || "";
  if (query.length < 2) return NextResponse.json({ users: [] });

  const textSearch = new RegExp(escapeRegExp(query), "i");
  const mobileQuery = normalizeDigits(query).replace(/[\s()-]/g, "");
  const mobileSearch = new RegExp(escapeRegExp(mobileQuery), "i");
  await dbConnect();
  const users = await User.find({
    role: "user",
    $or: [
      { username: textSearch },
      { mobile: mobileSearch },
      { email: textSearch },
    ],
  })
    .select("username mobile email")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return NextResponse.json({ users });
}

