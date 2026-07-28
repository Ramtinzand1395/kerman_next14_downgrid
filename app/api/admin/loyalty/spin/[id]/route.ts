// app/api/admin/loyalty/spin/[id]/route.ts
import { NextRequest } from "next/server";
import { SpinPrize } from "@/model/Loyalty Club/SpinHistory";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { spinPrizeUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data, error } = await parseBody(req, spinPrizeUpdateSchema);
  if (error) return error;
  const doc = await SpinPrize.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!doc) return fail("جایزه یافت نشد", 404);
  return ok(doc);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const doc = await SpinPrize.findByIdAndDelete(id);
  if (!doc) return fail("جایزه یافت نشد", 404);
  return ok({ done: true });
}
