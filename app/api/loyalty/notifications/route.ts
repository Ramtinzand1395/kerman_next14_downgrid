// app/api/loyalty/notifications/route.ts
// GET: اعلان‌های کاربر (باشگاه مشتریان + سایر) — PATCH: خوانده‌شدن همه
import Notification from "@/model/Notification";
import { ok, requireUser } from "@/lib/loyalty/api";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));

  const filter = { for: "user", user: auth.userId };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);

  return ok({ items, total, page, pages: Math.ceil(total / limit), unread });
}

export async function PATCH() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await Notification.updateMany({ for: "user", user: auth.userId, isRead: false }, { $set: { isRead: true } });
  return ok({ done: true });
}
