// app/api/loyalty/achievements/route.ts
// GET: نشان‌های کسب‌شده کاربر
import { ok, requireUser } from "@/lib/loyalty/api";
import { getUserAchievements } from "@/lib/loyalty/achievement.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getUserAchievements(auth.userId));
}
