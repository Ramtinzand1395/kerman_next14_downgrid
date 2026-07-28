// app/api/admin/loyalty/coupons/[id]/route.ts — مشاهده/ویرایش/حذف کوپن
import { NextRequest } from "next/server";
import Coupon from "@/model/Loyalty Club/Coupon";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { couponUpdateSchema } from "@/validations/loyalty.validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) return fail("کوپن یافت نشد", 404);
  return ok(coupon);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const { data, error } = await parseBody(req, couponUpdateSchema);
  if (error) return error;

  const coupon = await Coupon.findByIdAndUpdate(id, { $set: data! }, { new: true });
  if (!coupon) return fail("کوپن یافت نشد", 404);
  return ok(coupon);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  // حذف نرم: غیرفعال‌سازی برای حفظ تاریخچه استفاده
  const coupon = await Coupon.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
  if (!coupon) return fail("کوپن یافت نشد", 404);
  return ok({ done: true });
}
