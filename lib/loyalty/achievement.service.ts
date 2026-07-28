// lib/loyalty/achievement.service.ts
// بررسی و اعطای نشان‌ها — بعد از رویدادهای مهم (خرید، نظر، رفرال) صدا زده می‌شود.
// مقدار فعلی هر metric از شمارنده‌های روی User خوانده می‌شود.
import Achievement from "@/model/Loyalty Club/Achievement";
import UserAchievement from "@/model/Loyalty Club/UserAchievement";
import User from "@/model/User";
import Referral from "@/model/Loyalty Club/Referral";
import Comment from "@/model/Comment";
import LoginStreak from "@/model/Loyalty Club/LoginStreak";
import Notification from "@/model/Notification";
import { grantXp } from "./experience.service";
import { MissionMetric } from "@/types/loyalty";

/** مقدار فعلی یک metric برای کاربر */
async function metricValue(userId: string, metric: MissionMetric): Promise<number> {
  switch (metric) {
    case "purchase_count": {
      const u = await User.findById(userId).select("successfulOrders").lean();
      return u?.successfulOrders ?? 0;
    }
    case "purchase_amount": {
      const u = await User.findById(userId).select("totalPurchase").lean();
      return u?.totalPurchase ?? 0;
    }
    case "review_count":
      return Comment.countDocuments({ user: userId, verified: true });
    case "referral_count":
      return Referral.countDocuments({ referrer: userId, status: "rewarded" });
    case "login_days": {
      const s = await LoginStreak.findOne({ user: userId }).lean();
      return s?.longestStreak ?? 0;
    }
    default:
      return 0;
  }
}

/** بررسی همه نشان‌های فعال و اعطای موارد جدید */
export async function checkAchievements(userId: string): Promise<string[]> {
  const achievements = await Achievement.find({ isActive: true }).lean();
  if (!achievements.length) return [];

  const owned = await UserAchievement.find({ user: userId }).select("achievement").lean();
  const ownedSet = new Set(owned.map((o) => o.achievement.toString()));

  const earned: string[] = [];

  for (const a of achievements) {
    if (ownedSet.has(a._id.toString())) continue;
    const value = await metricValue(userId, a.metric);
    if (value < a.target) continue;

    try {
      await UserAchievement.create({
        user: userId,
        achievement: a._id,
        snapshot: { code: a.code, title: a.title, icon: a.icon },
      });
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue; // قبلاً گرفته
      throw err;
    }

    earned.push(a.title);

    if (a.xpReward > 0) {
      await grantXp({
        userId,
        amount: a.xpReward,
        reason: "admin_grant", // نشان‌ها reason اختصاصی ندارند؛ با توضیح مشخص می‌شوند
        idempotencyKey: `achievement:${a._id}:${userId}`,
        description: `پاداش نشان «${a.title}»`,
        applyVipMultiplier: false,
      });
    }

    await Notification.create({
      title: "نشان جدید",
      message: `تبریک! نشان «${a.title}» را کسب کردید.`,
      type: "achievement",
      for: "user",
      user: userId,
      target: { kind: "Achievement", item: a._id },
    }).catch(() => {});
  }

  return earned;
}

/** نشان‌های کاربر */
export async function getUserAchievements(userId: string) {
  return UserAchievement.find({ user: userId }).sort({ createdAt: -1 }).lean();
}
