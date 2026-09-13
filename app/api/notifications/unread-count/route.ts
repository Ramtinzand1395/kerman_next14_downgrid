import { NextResponse } from "next/server";
import { getNotificationSession } from "@/lib/notifications/session";
import { getUnreadCount } from "@/lib/notifications/service";

export async function GET() {
  const actor = await getNotificationSession();
  if (!actor) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  const unreadCount = await getUnreadCount(actor.session.user.id, actor.recipientRole);
  return NextResponse.json({ unreadCount });
}

