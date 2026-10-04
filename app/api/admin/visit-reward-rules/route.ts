import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import VisitRewardRule from "@/model/VisitRewardRule";
import { visitRewardRuleSchema } from "@/validations/appointment.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await VisitRewardRule.find().sort({ createdAt: -1 }).lean());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = visitRewardRuleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "قانون نامعتبر است", 422);
  const doc = await VisitRewardRule.create({ ...parsed.data, updatedBy: auth.userId });
  return ok(doc, 201);
}
