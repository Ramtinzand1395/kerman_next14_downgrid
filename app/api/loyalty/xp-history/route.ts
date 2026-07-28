// app/api/loyalty/xp-history/route.ts
// GET: تاریخچه XP با صفحه‌بندی
import { NextRequest } from "next/server";
import { ok, requireUser } from "@/lib/loyalty/api";
import { getXpHistory } from "@/lib/loyalty/experience.service";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));
  return ok(await getXpHistory(auth.userId, { page, limit }));
}
