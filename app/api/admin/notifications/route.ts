// app/api/admin/notifications/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import { adminSendNotificationSchema } from "@/validations/notification.validation";
import { createCampaign } from "@/lib/notifications/campaigns";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const parsed = adminSendNotificationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "اطلاعات اعلان نامعتبر است.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { recipient, recipientId, title, message, priority, link } = parsed.data;
  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || !/^[a-zA-Z0-9:_-]{16,160}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: "کلید idempotency معتبر الزامی است." }, { status: 400 });
  }
  const campaign = await createCampaign({
    createdBy: session.user.id,
    idempotencyKey,
    title,
    message,
    priority,
    link: link || undefined,
    audience: recipient === "user"
      ? { kind: "selected", userIds: [recipientId!] }
      : { kind: "all_users" },
    mode: "send",
  });
  return NextResponse.json({ success: true, queued: true, campaign }, { status: 202 });
}
