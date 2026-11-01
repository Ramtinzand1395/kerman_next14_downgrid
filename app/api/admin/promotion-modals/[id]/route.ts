import mongoose from "mongoose";
import { ok, fail, parseBody, requireAdmin } from "@/lib/loyalty/api";
import PromotionModal from "@/model/PromotionModal";
import Coupon from "@/model/Loyalty Club/Coupon";
import { promotionSchema } from "@/validations/promotion.validation";

type Context = { params: { id: string } };

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (auth.role !== "superadmin") return fail("دسترسی غیرمجاز", 403);
  if (!mongoose.isValidObjectId(params.id)) return fail("شناسه نامعتبر است", 400);
  const { data, error } = await parseBody(req, promotionSchema);
  if (error) return error;
  const coupon = await Coupon.findOne({ _id: data!.coupon, perUserLimit: 1 });
  if (!coupon) return fail("کد این پیام باید برای هر کاربر فقط یک بار قابل استفاده باشد.", 422);
  const item = await PromotionModal.findOneAndUpdate({ _id: params.id, deletedAt: null },
    { $set: data! }, { returnDocument: "after", runValidators: true });
  return item ? ok(item) : fail("پیام پیدا نشد", 404);
}

export async function DELETE(_req: Request, { params }: Context) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (auth.role !== "superadmin") return fail("دسترسی غیرمجاز", 403);
  if (!mongoose.isValidObjectId(params.id)) return fail("شناسه نامعتبر است", 400);
  const item = await PromotionModal.findOneAndUpdate({ _id: params.id, deletedAt: null },
    { $set: { isActive: false, deletedAt: new Date() } });
  return item ? ok({ done: true }) : fail("پیام پیدا نشد", 404);
}
