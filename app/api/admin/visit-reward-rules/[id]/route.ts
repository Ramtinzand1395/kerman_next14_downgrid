import mongoose from "mongoose";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import VisitRewardRule from "@/model/VisitRewardRule";
import { visitRewardRuleSchema } from "@/validations/appointment.validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه قانون نامعتبر است", 422);
  const parsed = visitRewardRuleSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "قانون نامعتبر است", 422);
  const doc = await VisitRewardRule.findByIdAndUpdate(
    id,
    { $set: { ...parsed.data, updatedBy: auth.userId }, $inc: { version: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!doc) return fail("قانون پیدا نشد", 404);
  return ok(doc);
}
