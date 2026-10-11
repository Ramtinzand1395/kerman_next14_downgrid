import mongoose from "mongoose";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import VisitRewardRule from "@/model/VisitRewardRule";
import {
  normalizeRewardRuleData,
  visitRewardRuleSchema,
} from "@/validations/appointment.validation";
import { formatRewardDescription } from "@/lib/appointments/policy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه قانون نامعتبر است", 422);
  const rule = await VisitRewardRule.findById(id).lean();
  if (!rule) return fail("قانون پیدا نشد", 404);
  return ok({
    ...rule,
    rewardDescription: formatRewardDescription(rule.reward),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه قانون نامعتبر است", 422);

  const current = await VisitRewardRule.findById(id);
  if (!current) return fail("قانون پیدا نشد", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("بدنه درخواست نامعتبر است", 422);

  const currentObj = current.toObject();
  const merged = {
    title: body.title !== undefined ? body.title : currentObj.title,
    requiredVisits:
      body.requiredVisits !== undefined ? body.requiredVisits : currentObj.requiredVisits,
    eligibleServices:
      body.eligibleServices !== undefined
        ? body.eligibleServices
        : currentObj.eligibleServices,
    recurrence: body.recurrence !== undefined ? body.recurrence : currentObj.recurrence,
    reward: {
      ...currentObj.reward,
      ...(body.reward || {}),
    },
    startsAt: body.startsAt !== undefined ? body.startsAt : currentObj.startsAt,
    endsAt: body.endsAt !== undefined ? body.endsAt : currentObj.endsAt,
    isActive: body.isActive !== undefined ? body.isActive : currentObj.isActive,
  };

  const normalized = normalizeRewardRuleData(merged);
  const validated = visitRewardRuleSchema.safeParse(normalized);
  if (!validated.success) {
    return fail(validated.error.issues[0]?.message || "قانون نامعتبر است", 422);
  }

  current.set({
    ...validated.data,
    updatedBy: auth.userId,
  });
  current.version = (current.version || 1) + 1;
  await current.save();

  return ok({
    ...current.toObject(),
    rewardDescription: formatRewardDescription(current.reward),
  });
}
