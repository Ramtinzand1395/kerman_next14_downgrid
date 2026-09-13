// app/api/admin/notifications/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { notifyAllUsers, notifyUser } from "@/lib/notifications/service";
import { adminSendNotificationSchema } from "@/validations/notification.validation";
import User from "@/model/User";

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

  await dbConnect();
  const { recipient, recipientId, title, message, priority, link } = parsed.data;
  const payload = {
    type: "ADMIN_MESSAGE" as const,
    category: "system" as const,
    title,
    message,
    priority,
    link: link || undefined,
    senderType: "admin" as const,
    senderId: session.user.id,
    eventKey: `ADMIN_MESSAGE:${crypto.randomUUID()}`,
  };

  if (recipient === "user") {
    const user = await User.exists({ _id: recipientId, role: "user" });
    if (!user) return NextResponse.json({ error: "کاربر پیدا نشد." }, { status: 404 });
    await notifyUser({ ...payload, userId: recipientId! });
    return NextResponse.json({ success: true, sentCount: 1 }, { status: 201 });
  }

  const sentCount = await notifyAllUsers(payload);
  return NextResponse.json({ success: true, sentCount }, { status: 201 });
}
