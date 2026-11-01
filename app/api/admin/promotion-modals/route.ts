import { ok, fail, parseBody, requireAdmin } from "@/lib/loyalty/api";
import PromotionModal from "@/model/PromotionModal";
import Coupon from "@/model/Loyalty Club/Coupon";
import { promotionSchema } from "@/validations/promotion.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (auth.role !== "superadmin") return fail("دسترسی غیرمجاز", 403);
  const [items, coupons] = await Promise.all([
    PromotionModal.find({ deletedAt: null }).sort({ priority: -1, createdAt: -1 })
      .limit(200).populate("coupon", "code title isActive perUserLimit value type").lean(),
    Coupon.find({ perUserLimit: 1, isActive: true }).sort({ createdAt: -1 })
      .limit(200).select("code title type value minPurchaseAmount maxDiscountAmount products categories expiresAt").lean(),
  ]);
  return ok({ items, coupons });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (auth.role !== "superadmin") return fail("دسترسی غیرمجاز", 403);
  const { data, error } = await parseBody(req, promotionSchema);
  if (error) return error;
  const coupon = await Coupon.findOne({ _id: data!.coupon, perUserLimit: 1 });
  if (!coupon) return fail("برای این پیام، کدی با محدودیت یک بار برای هر کاربر انتخاب کنید.", 422);
  return ok(await PromotionModal.create(data!), 201);
}
