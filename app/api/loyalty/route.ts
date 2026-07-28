// app/api/loyalty/route.ts
// GET: داشبورد یک‌جای باشگاه مشتریان کاربر — کیف پول، XP، Level، VIP، زنجیره، رفرال
import { ok, requireUser } from "@/lib/loyalty/api";
import { getUserExperience } from "@/lib/loyalty/experience.service";
import { getBalance } from "@/lib/loyalty/wallet.service";
import { getStreak } from "@/lib/loyalty/loginStreak.service";
import { getReferralStats } from "@/lib/loyalty/referral.service";
import User from "@/model/User";
import { VIP_TIER_FA, VipTier } from "@/types/loyalty";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [user, balance, xp, streak, referral] = await Promise.all([
    User.findById(auth.userId).select("vipTier totalPurchase successfulOrders").lean(),
    getBalance(auth.userId),
    getUserExperience(auth.userId),
    getStreak(auth.userId),
    getReferralStats(auth.userId),
  ]);

  return ok({
    wallet: { balance },
    experience: xp,
    vip: {
      tier: (user?.vipTier as VipTier | undefined) ?? null,
      tierTitle: user?.vipTier ? VIP_TIER_FA[user.vipTier as VipTier] : null,
    },
    stats: {
      totalPurchase: user?.totalPurchase ?? 0,
      successfulOrders: user?.successfulOrders ?? 0,
    },
    streak,
    referral,
  });
}
