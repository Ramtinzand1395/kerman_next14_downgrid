// app/api/admin/loyalty/achievements/[id]/route.ts
import { NextRequest } from "next/server";
import Achievement from "@/model/Achievement";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { achievementUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data, error } = await parseBody(req, achievementUpdateSchema);
  if (error) return error;
  const doc = await Achievement.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!doc) return fail("نشان یافت نشد", 404);
  return ok(doc);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const doc = await Achievement.findByIdAndDelete(id);
  if (!doc) return fail("نشان یافت نشد", 404);
  return ok({ done: true });
}
