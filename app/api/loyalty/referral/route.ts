// app/api/loyalty/referral/route.ts
// GET: کد دعوت و آمار رفرال کاربر
import { ok, requireUser } from "@/lib/loyalty/api";
import { getReferralStats } from "@/lib/loyalty/referral.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getReferralStats(auth.userId));
}
