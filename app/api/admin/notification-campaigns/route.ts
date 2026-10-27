import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { createCampaign, listCampaigns } from "@/lib/notifications/campaigns";
import { notificationCampaignSchema } from "@/validations/notification.validation";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const page = Number(req.nextUrl.searchParams.get("page") || 1);
  const limit = Number(req.nextUrl.searchParams.get("limit") || 10);
  return NextResponse.json(await listCampaigns(page, limit));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const parsed = notificationCampaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "اطلاعات پیام نامعتبر است.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    const campaign = await createCampaign({ ...parsed.data, createdBy: session.user.id });
    return NextResponse.json({ campaign }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_RATE_LIMIT") {
      return NextResponse.json({ error: "حداکثر ۲۰ ارسال در یک ساعت مجاز است." }, { status: 429 });
    }
    throw error;
  }
}
