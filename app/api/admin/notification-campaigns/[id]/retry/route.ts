import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { retryFailedDeliveries } from "@/lib/notifications/campaigns";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const result = await retryFailedDeliveries(id);
  if (!result) return NextResponse.json({ error: "ارسال پیدا نشد یا قابل تلاش مجدد نیست." }, { status: 404 });
  return NextResponse.json(result);
}
