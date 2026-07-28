// lib/loyalty/loginStreak.service.ts
// زنجیره ورود روزانه:
// - ورود در روز جدید → افزایش زنجیره (اگر دیروز هم آمده بود) وگرنه ریست به ۱.
// - پاداش XP هر روز از آرایه dailyXpRewards تنظیمات؛ روز هفتم پاداش کیف پول.
// - idempotent بر اساس dayKey — چند ورود در یک روز فقط یک بار پاداش دارد.
import LoginStreak from "@/model/Loyalty Club/LoginStreak";
import { grantXp, getSettings } from "./experience.service";
import { credit } from "./wallet.service";
import { dayKey, yesterdayKey } from "./dateKeys";

export interface StreakResult {
  streak: number;
  longest: number;
  isNewDay: boolean;
  xpAwarded: number;
  walletAwarded: number;
  reset: boolean;
}

export async function registerDailyLogin(userId: string): Promise<StreakResult> {
  const today = dayKey();
  const yesterday = yesterdayKey();

  // قفل اتمیک: فقط اولین ورود امروز پردازش می‌شود
  const claimed = await LoginStreak.findOneAndUpdate(
    { user: userId, lastLoginDayKey: { $ne: today } },
    [
      {
        $set: {
          currentStreak: {
            $cond: [{ $eq: ["$lastLoginDayKey", yesterday] }, { $add: ["$currentStreak", 1] }, 1],
          },
          longestStreak: {
            $max: [
              "$longestStreak",
              { $cond: [{ $eq: ["$lastLoginDayKey", yesterday] }, { $add: ["$currentStreak", 1] }, 1] },
            ],
          },
          lastLoginDayKey: today,
        },
      },
    ],
    { upsert: true, new: true },
  );

  if (claimed.lastLoginDayKey !== today) {
    // race نادر: هم‌زمان به‌روز شد — وضعیت فعلی را برگردان
    const cur = await LoginStreak.findOne({ user: userId }).lean();
    return {
      streak: cur?.currentStreak ?? 1,
      longest: cur?.longestStreak ?? 1,
      isNewDay: false,
      xpAwarded: 0,
      walletAwarded: 0,
      reset: false,
    };
  }

  const streak = claimed.currentStreak;
  const wasReset = streak === 1;
  const settings = await getSettings();

  // پاداش XP روز (چرخه ۷ روزه)
  const rewards = settings.loginStreak.dailyXpRewards;
  const dayIndex = (streak - 1) % Math.max(1, rewards.length);
  const xp = rewards[dayIndex] ?? 0;
  let xpAwarded = 0;
  if (xp > 0) {
    const r = await grantXp({
      userId,
      amount: xp,
      reason: "daily_login",
      idempotencyKey: `streak:${userId}:${today}`,
      description: `ورود روزانه — روز ${streak.toLocaleString("fa-IR")} زنجیره`,
      applyVipMultiplier: false,
    });
    if (r.ok && !r.duplicate) xpAwarded = xp;
  }

  // پاداش کیف پول روز هفتم
  let walletAwarded = 0;
  if (streak % 7 === 0 && settings.loginStreak.daySevenWalletReward > 0) {
    const amount = settings.loginStreak.daySevenWalletReward;
    const r = await credit({
      userId,
      amount,
      type: "gift",
      idempotencyKey: `streak7:${userId}:${today}`,
      description: `پاداش زنجیره ۷ روزه ورود`,
      notify: {
        title: "پاداش زنجیره ورود",
        message: `مبلغ ${amount.toLocaleString("fa-IR")} تومان بابت ۷ روز ورود متوالی به کیف پول شما اضافه شد.`,
      },
    });
    if (r.ok && !r.duplicate) walletAwarded = amount;
  }

  return {
    streak,
    longest: claimed.longestStreak,
    isNewDay: true,
    xpAwarded,
    walletAwarded,
    reset: wasReset,
  };
}

export async function getStreak(userId: string) {
  const today = dayKey();
  const yesterday = yesterdayKey();
  const s = await LoginStreak.findOne({ user: userId }).lean();
  if (!s) return { currentStreak: 0, longestStreak: 0, activeToday: false };
  const activeToday = s.lastLoginDayKey === today;
  // اگر آخرین ورود نه امروز نه دیروز بوده → زنجیره عملاً شکسته است
  const alive = activeToday || s.lastLoginDayKey === yesterday;
  return {
    currentStreak: alive ? s.currentStreak : 0,
    longestStreak: s.longestStreak,
    activeToday,
  };
}
