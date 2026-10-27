import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { campaignAudienceSchema } from "@/validations/notification.validation";
import { previewAudience } from "@/lib/notifications/campaigns";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const parsed = campaignAudienceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "گروه مخاطبان معتبر نیست." }, { status: 400 });
  }
  return NextResponse.json(await previewAudience(parsed.data));
}
