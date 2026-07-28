// app/api/loyalty/spin/route.ts
// GET: وضعیت گردونه (آیا امروز می‌توان چرخاند؟ + جوایز فعال + تاریخچه)
// POST: چرخاندن گردونه — روزانه یک بار
import { ok, requireUser, withRateLimit } from "@/lib/loyalty/api";
import { getSpinStatus, spin } from "@/lib/loyalty/spin.service";
import { SpinPrize } from "@/model/SpinHistory";
import { fail } from "@/lib/loyalty/api";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [status, prizes] = await Promise.all([
    getSpinStatus(auth.userId),
    SpinPrize.find({ isActive: true }).sort({ order: 1 }).select("title type value order").lean(),
  ]);
  return ok({ ...status, prizes });
}

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  // محدودیت نرخ سخت‌گیرانه برای گردونه
  const limited = withRateLimit(`spin:${auth.userId}`, { limit: 3, windowMs: 60_000 });
  if (limited) return limited;

  const result = await spin(auth.userId);
  if (!result.ok) return fail(result.error ?? "خطا در چرخش گردونه", result.alreadySpunToday ? 409 : 400);
  return ok(result);
}
