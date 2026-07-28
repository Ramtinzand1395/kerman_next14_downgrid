// app/api/admin/loyalty/coupons/route.ts — لیست/ساخت کوپن
import { NextRequest } from "next/server";
import Coupon from "@/model/Coupon";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { couponCreateSchema } from "@/validations/loyalty.validation";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const filter: Record<string, unknown> = {};
  if (sp.get("search")) filter.code = { $regex: sp.get("search")!.toUpperCase(), $options: "i" };
  if (sp.get("isActive")) filter.isActive = sp.get("isActive") === "true";

  const [items, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, couponCreateSchema);
  if (error) return error;

  const coupon = await Coupon.create({ ...data!, createdBy: auth.userId });
  return ok(coupon, 201);
}
