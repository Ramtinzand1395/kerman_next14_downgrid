import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

async function requireStoreAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    // const authError = await requireStoreAdmin();
    // if (authError) return authError;
    await dbConnect();

    const job = await PrintQueue.find();

    if (!job) {
      return NextResponse.json({
        success: true,
        jobExists: false,
        payload: null,
      });
    }

    return NextResponse.json({
      success: true,
      jobExists: true,
      payload: job,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // const authError = await requireStoreAdmin();
    // if (authError) return authError;
    await dbConnect();

    const body = await req.json();

    const job = await PrintQueue.create({
      payload: body,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
