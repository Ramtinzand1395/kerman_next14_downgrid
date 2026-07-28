// app/api/loyalty/missions/route.ts
// GET: ماموریت‌های فعال + پیشرفت کاربر
import { ok, requireUser } from "@/lib/loyalty/api";
import { getUserMissions } from "@/lib/loyalty/mission.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getUserMissions(auth.userId));
}
