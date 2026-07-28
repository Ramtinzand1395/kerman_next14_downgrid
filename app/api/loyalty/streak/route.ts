// app/api/loyalty/streak/route.ts
// GET: وضعیت زنجیره ورود — POST: ثبت ورود امروز (دریافت پاداش)
import { ok, requireUser, withRateLimit } from "@/lib/loyalty/api";
import { getStreak, registerDailyLogin } from "@/lib/loyalty/loginStreak.service";
import { trackEvent } from "@/lib/loyalty/mission.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getStreak(auth.userId));
}

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const limited = withRateLimit(`streak:${auth.userId}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const result = await registerDailyLogin(auth.userId);
  // ماموریت‌های login_days
  if (result.isNewDay) {
    await trackEvent({ userId: auth.userId, metric: "login_days", value: 1 }).catch(() => {});
  }
  return ok(result);
}
