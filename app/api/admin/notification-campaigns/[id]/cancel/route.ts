import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { cancelCampaign } from "@/lib/notifications/campaigns";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const campaign = await cancelCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "ارسال شروع شده یا دیگر قابل لغو نیست." }, { status: 409 });
  }
  return NextResponse.json({ campaign });
}
