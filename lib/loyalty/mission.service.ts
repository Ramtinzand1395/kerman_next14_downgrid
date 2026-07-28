// lib/loyalty/mission.service.ts
// موتور ماموریت‌ها:
// - رویدادهای سیستم (خرید، نظر، ورود، رفرال) با trackEvent به این سرویس گزارش می‌شوند.
// - پیشرفت به‌صورت اتمیک (upsert + $inc) روی MissionProgress ثبت می‌شود.
// - رسیدن به هدف → completed؛ پرداخت پاداش با claimMissionReward (idempotent) انجام می‌شود.
import Mission, { IMission } from "@/model/Loyalty Club/Mission";
import MissionProgress from "@/model/Loyalty Club/MissionProgress";
import Notification from "@/model/Notification";
import { credit } from "./wallet.service";
import { grantXp } from "./experience.service";
import { MissionMetric } from "@/types/loyalty";
import { periodKey } from "./dateKeys";

export interface TrackEventInput {
  userId: string;
  metric: MissionMetric;
  /** مقدار رویداد — مثلاً ۱ برای یک خرید، یا مبلغ سفارش برای purchase_amount */
  value: number;
  /** مبلغ سفارش برای فیلتر minOrderAmount */
  orderAmount?: number;
}

/** ماموریت‌های فعالِ منطبق با رویداد را پیدا و پیشرفت را به‌روز می‌کند */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  const now = new Date();
  const missions = await Mission.find({
    isActive: true,
    metric: input.metric,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  }).lean();

  for (const mission of missions) {
    // فیلتر حداقل مبلغ خرید
    if (
      (mission.metric === "purchase_count" || mission.metric === "purchase_amount") &&
      mission.minOrderAmount &&
      (input.orderAmount ?? 0) < mission.minOrderAmount
    ) {
      continue;
    }

    const key = periodKey(mission.period, now);
    const inc = mission.metric === "purchase_amount" ? Math.round(input.value) : input.value;

    // افزایش اتمیک پیشرفت — فقط اگر هنوز تکمیل نشده
    const progress = await MissionProgress.findOneAndUpdate(
      { user: input.userId, mission: mission._id, periodKey: key, completed: false },
      { $inc: { progress: inc }, $setOnInsert: { rewardClaimed: false } },
      { upsert: true, new: true },
    );

    if (progress.progress >= mission.target && !progress.completed) {
      // تکمیل اتمیک — فقط اولین نفر برنده می‌شود
      const completed = await MissionProgress.findOneAndUpdate(
        { _id: progress._id, completed: false },
        { $set: { completed: true, completedAt: new Date() } },
        { new: true },
      );
      if (completed) {
        await Notification.create({
          title: "تکمیل ماموریت",
          message: `ماموریت «${mission.title}» را تکمیل کردید! پاداش شما به‌زودی اعمال می‌شود.`,
          type: "mission_complete",
          for: "user",
          user: input.userId,
          target: { kind: "Mission", item: mission._id },
        }).catch(() => {});
        // پاداش به‌صورت خودکار پرداخت می‌شود (بدون نیاز به کلیک کاربر)
        await claimMissionReward(input.userId, mission, key);
      }
    }
  }
}

/** پرداخت پاداش ماموریت — idempotent با قفل rewardClaimed */
export async function claimMissionReward(
  userId: string,
  mission: Pick<IMission, "_id" | "title" | "reward">,
  key: string,
): Promise<{ claimed: boolean }> {
  const locked = await MissionProgress.findOneAndUpdate(
    { user: userId, mission: mission._id, periodKey: key, completed: true, rewardClaimed: false },
    { $set: { rewardClaimed: true, rewardClaimedAt: new Date() } },
    { new: true },
  );
  if (!locked) return { claimed: false };

  if (mission.reward.walletCredit > 0) {
    await credit({
      userId,
      amount: mission.reward.walletCredit,
      type: "mission_reward",
      idempotencyKey: `mission:${mission._id}:${userId}:${key}:wallet`,
      ref: { kind: "Mission", item: mission._id },
      description: `پاداش ماموریت «${mission.title}»`,
      notify: {
        title: "پاداش ماموریت",
        message: `مبلغ ${mission.reward.walletCredit.toLocaleString("fa-IR")} تومان پاداش ماموریت «${mission.title}» به کیف پول شما اضافه شد.`,
      },
    });
  }

  if (mission.reward.xp > 0) {
    await grantXp({
      userId,
      amount: mission.reward.xp,
      reason: "mission",
      idempotencyKey: `mission:${mission._id}:${userId}:${key}:xp`,
      ref: { kind: "Mission", item: mission._id.toString() },
      description: `پاداش ماموریت «${mission.title}»`,
    });
  }

  return { claimed: true };
}

/** لیست ماموریت‌های فعال + پیشرفت کاربر در دوره جاری */
export async function getUserMissions(userId: string) {
  const now = new Date();
  const missions = await Mission.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const keys = [...new Set(missions.map((m) => periodKey(m.period, now)))];
  const progresses = await MissionProgress.find({
    user: userId,
    periodKey: { $in: keys },
  }).lean();

  const progressMap = new Map(
    progresses.map((p) => [`${p.mission.toString()}:${p.periodKey}`, p]),
  );

  return missions.map((m) => {
    const key = periodKey(m.period, now);
    const p = progressMap.get(`${m._id.toString()}:${key}`);
    return {
      ...m,
      periodKey: key,
      progress: p?.progress ?? 0,
      completed: p?.completed ?? false,
      rewardClaimed: p?.rewardClaimed ?? false,
    };
  });
}
