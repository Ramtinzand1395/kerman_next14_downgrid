import { NextRequest, NextResponse } from "next/server";
import { getNotificationSession } from "@/lib/notifications/session";
import { getNotifications } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  const actor = await getNotificationSession();
  if (!actor) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const readParam = searchParams.get("read");
  const read = readParam === "true" ? true : readParam === "false" ? false : undefined;

  const result = await getNotifications(
    actor.session.user.id,
    actor.recipientRole,
    { page, limit, read },
  );
  return NextResponse.json(result);
}

