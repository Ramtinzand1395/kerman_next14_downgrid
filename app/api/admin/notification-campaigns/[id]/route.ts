import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getCampaign } from "@/lib/notifications/campaigns";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const campaign = await getCampaign(
    id,
    Number(req.nextUrl.searchParams.get("page") || 1),
    Number(req.nextUrl.searchParams.get("limit") || 50),
  );
  if (!campaign) return NextResponse.json({ error: "ارسال پیدا نشد." }, { status: 404 });
  return NextResponse.json({ campaign });
}
