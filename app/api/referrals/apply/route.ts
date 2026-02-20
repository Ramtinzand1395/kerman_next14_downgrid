import { NextResponse } from "next/server";
import User from "@/model/User";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function POST(req: Request) {
  try {
     const session = await getServerSession(authOptions);
       const userId = session?.user;
    await dbConnect();

    const body = (await req.json().catch(() => null)) as {
      code?: string;
    } | null;
    const code = (body?.code || "").toString().trim().toUpperCase();

    if (!code)
      return NextResponse.json(
        { ok: false, error: "MISSING_CODE" },
        { status: 400 },
      );

    const me = await User.findById(userId);
    if (!me)
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 },
      );

    // قبلاً معرفی شده؟
    if (me.referredBy)
      return NextResponse.json(
        { ok: false, error: "ALREADY_REFERRED" },
        { status: 400 },
      );

    // پیدا کردن معرفی‌کننده
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer)
      return NextResponse.json(
        { ok: false, error: "CODE_NOT_FOUND" },
        { status: 404 },
      );

    // جلوگیری از معرفی خود
    if (String(referrer._id) === String(me._id))
      return NextResponse.json(
        { ok: false, error: "CANNOT_REFER_SELF" },
        { status: 400 },
      );

    me.referredBy = referrer._id;
    await me.save();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    const status =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
