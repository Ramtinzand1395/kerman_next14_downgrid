import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import VisitRewardRule from "@/model/VisitRewardRule";
import {
  normalizeRewardRuleData,
  visitRewardRuleSchema,
} from "@/validations/appointment.validation";
import { formatRewardDescription } from "@/lib/appointments/policy";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rules = await VisitRewardRule.find().sort({ createdAt: -1 }).lean();
  const items = rules.map((rule) => ({
    ...rule,
    rewardDescription: formatRewardDescription(rule.reward),
  }));
  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = visitRewardRuleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "قانون نامعتبر است", 422);
  const normalized = normalizeRewardRuleData(parsed.data);
  const doc = await VisitRewardRule.create({ ...normalized, updatedBy: auth.userId });
  return ok(
    {
      ...doc.toObject(),
      rewardDescription: formatRewardDescription(doc.reward),
    },
    201,
  );
}
