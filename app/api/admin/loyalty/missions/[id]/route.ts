// app/api/admin/loyalty/missions/[id]/route.ts — ویرایش/حذف ماموریت
import { NextRequest } from "next/server";
import Mission from "@/model/Loyalty Club/Mission";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { missionUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const { data, error } = await parseBody(req, missionUpdateSchema);
  if (error) return error;

  const mission = await Mission.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!mission) return fail("ماموریت یافت نشد", 404);
  return ok(mission);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const mission = await Mission.findByIdAndDelete(id);
  if (!mission) return fail("ماموریت یافت نشد", 404);
  return ok({ done: true });
}
