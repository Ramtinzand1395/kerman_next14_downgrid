// app/api/loyalty/notifications/route.ts
// GET: اعلان‌های کاربر (باشگاه مشتریان + سایر) — PATCH: خوانده‌شدن همه
import { ok, requireUser } from "@/lib/loyalty/api";
import { NextRequest } from "next/server";
import { getNotifications, markAllAsRead } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));

  const result = await getNotifications(auth.userId, "USER", { page, limit });

  return ok({
    items: result.notifications,
    total: result.pagination.total,
    page: result.pagination.page,
    pages: result.pagination.pages,
    unread: result.unreadCount,
  });
}

export async function PATCH() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await markAllAsRead(auth.userId, "USER");
  return ok({ done: true });
}
