// app/api/admin/loyalty/vip/route.ts — تغییر دستی VIP کاربر توسط مدیر
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import User from "@/model/User";
import MembershipHistory from "@/model/Loyalty Club/MembershipHistory";
import Notification from "@/model/Notification";
import { VIP_TIERS, VIP_TIER_FA, VipTier } from "@/types/loyalty";
import { z } from "zod";

const schema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "شناسه کاربر نامعتبر"),
  tier: z.enum(VIP_TIERS).nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const user = await User.findById(data!.userId).select("vipTier").lean();
  if (!user) return fail("کاربر یافت نشد", 404);

  const from = (user.vipTier as VipTier | undefined) ?? null;
  if (from === data!.tier) return ok({ changed: false });

  await User.updateOne({ _id: data!.userId }, { $set: { vipTier: data!.tier ?? undefined } });
  await MembershipHistory.create({
    user: data!.userId,
    kind: "vip",
    from,
    to: data!.tier,
    reason: "admin_change",
    performedBy: auth.userId,
  });

  await Notification.create({
    title: "تغییر عضویت VIP",
    message: data!.tier
      ? `عضویت شما به سطح «${VIP_TIER_FA[data!.tier]}» تغییر یافت.`
      : "عضویت VIP شما پایان یافت.",
    type: "vip_change",
    for: "user",
    user: data!.userId,
  }).catch(() => {});

  return ok({ changed: true, tier: data!.tier });
}
