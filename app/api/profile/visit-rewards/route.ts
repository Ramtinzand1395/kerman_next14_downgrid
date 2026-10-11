import { requireUser, ok } from "@/lib/loyalty/api";
import { getVisitRewardSummary } from "@/lib/appointments/rewards.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getVisitRewardSummary(auth.userId));
}

