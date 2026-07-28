// app/api/admin/loyalty/levels/route.ts — مشاهده/ویرایش سطوح Level و VIP
import { NextRequest } from "next/server";
import MembershipLevel from "@/model/Loyalty Club/MembershipLevel";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { membershipLevelUpdateSchema } from "@/validations/loyalty.validation";
import { invalidateLevelsCache } from "@/lib/loyalty/experience.service";
import { seedLoyalty } from "@/lib/loyalty/seed";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const kind = req.nextUrl.searchParams.get("kind");
  const filter = kind === "level" || kind === "vip" ? { kind } : {};
  return ok(await MembershipLevel.find(filter).sort({ kind: 1, order: 1 }).lean());
}

// ویرایش یک سطح بر اساس kind + code (در بدنه)
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as { kind?: string; code?: string } & Record<string, unknown>;
  if (!body.kind || !body.code) return fail("kind و code الزامی است", 400);

  const { data, error } = await parseBody(
    new Request(req.url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    membershipLevelUpdateSchema,
  );
  if (error) return error;

  const doc = await MembershipLevel.findOneAndUpdate(
    { kind: body.kind, code: body.code },
    { $set: data! },
    { new: true },
  );
  if (!doc) return fail("سطح یافت نشد", 404);
  invalidateLevelsCache();
  return ok(doc);
}

// اجرای seed (ایجاد سطوح پیش‌فرض)
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  await seedLoyalty();
  invalidateLevelsCache();
  return ok({ seeded: true });
}
