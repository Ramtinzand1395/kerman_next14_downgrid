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
  const handledParam = searchParams.get("handled");
  const handled = handledParam === "true" ? true : handledParam === "false" ? false : undefined;
  const parseDate = (value: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const result = await getNotifications(
    actor.session.user.id,
    actor.recipientRole,
    {
      page,
      limit,
      read,
      handled,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("q") || undefined,
      from: parseDate(searchParams.get("from")),
      to: parseDate(searchParams.get("to")),
    },
  );
  return NextResponse.json(result);
}

