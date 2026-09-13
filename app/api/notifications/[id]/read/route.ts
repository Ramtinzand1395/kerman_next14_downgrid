import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getNotificationSession } from "@/lib/notifications/session";
import { markAsRead } from "@/lib/notifications/service";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getNotificationSession();
  if (!actor) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه اعلان نامعتبر است." }, { status: 400 });

  const notification = await markAsRead(id, actor.session.user.id, actor.recipientRole);
  if (!notification) return NextResponse.json({ error: "اعلان پیدا نشد." }, { status: 404 });
  return NextResponse.json({ notification });
}

