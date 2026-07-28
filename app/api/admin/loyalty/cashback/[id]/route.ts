// app/api/admin/loyalty/cashback/[id]/route.ts
import { NextRequest } from "next/server";
import CashbackRule from "@/model/Loyalty Club/Cashback";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { cashbackRuleUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data, error } = await parseBody(req, cashbackRuleUpdateSchema);
  if (error) return error;
  const doc = await CashbackRule.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!doc) return fail("قاعده یافت نشد", 404);
  return ok(doc);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const doc = await CashbackRule.findByIdAndDelete(id);
  if (!doc) return fail("قاعده یافت نشد", 404);
  return ok({ done: true });
}
