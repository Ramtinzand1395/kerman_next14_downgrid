// app/api/admin/loyalty/campaigns/[id]/route.ts
import { NextRequest } from "next/server";
import Campaign from "@/model/Campaign";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { campaignUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const { data, error } = await parseBody(req, campaignUpdateSchema);
  if (error) return error;
  const doc = await Campaign.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!doc) return fail("کمپین یافت نشد", 404);
  return ok(doc);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const doc = await Campaign.findByIdAndDelete(id);
  if (!doc) return fail("کمپین یافت نشد", 404);
  return ok({ done: true });
}
