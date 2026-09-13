import { NextResponse } from "next/server";
import { getNotificationSession } from "@/lib/notifications/session";
import { markAllAsRead } from "@/lib/notifications/service";

export async function PATCH() {
  const actor = await getNotificationSession();
  if (!actor) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  const result = await markAllAsRead(actor.session.user.id, actor.recipientRole);
  return NextResponse.json({ updatedCount: result.modifiedCount });
}

