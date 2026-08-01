// app/api/loyalty/missions/claim/route.ts
// POST: دریافت پاداش ماموریت تکمیل‌شده توسط کاربر
// بدنه: { missionId, periodKey }
import { fail, ok, parseBody, requireUser, withRateLimit } from "@/lib/loyalty/api";
import { claimMissionReward } from "@/lib/loyalty/mission.service";
import Mission from "@/model/Mission";
import { z } from "zod";

const claimSchema = z.object({
  missionId: z.string().regex(/^[a-f\d]{24}$/i, "شناسه ماموریت نامعتبر است"),
  periodKey: z.string().min(4).max(20),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  // جلوگیری از اسپم درخواست دریافت پاداش
  const limited = withRateLimit(`mission-claim:${auth.userId}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { data, error } = await parseBody(req, claimSchema);
  if (error) return error;

  const mission = await Mission.findOne({ _id: data!.missionId, isActive: true })
    .select("title reward")
    .lean();
  if (!mission) return fail("ماموریت یافت نشد", 404);

  const result = await claimMissionReward(
    auth.userId,
    { _id: mission._id, title: mission.title, reward: mission.reward },
    data!.periodKey,
  );

  if (!result.claimed) {
    return fail("پاداش این ماموریت قبلاً دریافت شده یا ماموریت تکمیل نشده است", 409);
  }
  return ok({ claimed: true });
}
