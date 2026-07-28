// lib/loyalty/spin.service.ts
// گردونه شانس روزانه:
// - هر کاربر هر روز یک چرخش رایگان (یکتایی user+dayKey).
// - انتخاب جایزه وزنی (weighted random) — وزن‌ها از پنل مدیریت قابل تنظیم‌اند.
// - اعمال جایزه idempotent بر اساس SpinHistory._id.
import crypto from "crypto";
import SpinHistory, { SpinPrize, ISpinPrize } from "@/model/Loyalty Club/SpinHistory";
import Notification from "@/model/Notification";
import { credit } from "./wallet.service";
import { grantXp, getSettings } from "./experience.service";
import { dayKey } from "./dateKeys";

/** انتخاب وزنی با CSPRNG */
function pickWeighted(prizes: ISpinPrize[]): ISpinPrize | null {
  const active = prizes.filter((p) => p.isActive && p.weight > 0);
  const total = active.reduce((s, p) => s + p.weight, 0);
  if (!active.length || total <= 0) return null;
  // عدد تصادفی امن در بازه [0, total)
  const rand = (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) * total;
  let acc = 0;
  for (const p of active) {
    acc += p.weight;
    if (rand < acc) return p;
  }
  return active[active.length - 1];
}

export interface SpinResult {
  ok: boolean;
  alreadySpunToday?: boolean;
  prize?: { title: string; type: string; value: number };
  error?: string;
}

export async function spin(userId: string): Promise<SpinResult> {
  const settings = await getSettings();
  if (!settings.spin.enabled) return { ok: false, error: "گردونه شانس غیرفعال است" };

  const today = dayKey();
  const prizes = await SpinPrize.find({ isActive: true }).sort({ order: 1 }).lean();
  const prize = pickWeighted(prizes as unknown as ISpinPrize[]);
  if (!prize) return { ok: false, error: "جایزه‌ای تعریف نشده است" };

  // ثبت اتمیک چرخش — unique index (user, dayKey) جلوی چرخش دوم را می‌گیرد
  let history;
  try {
    history = await SpinHistory.create({
      user: userId,
      dayKey: today,
      prize: prize._id,
      prizeSnapshot: { title: prize.title, type: prize.type, value: prize.value },
      applied: false,
    });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return { ok: false, alreadySpunToday: true, error: "امروز گردونه را چرخانده‌اید" };
    }
    throw err;
  }

  // اعمال جایزه
  await applyPrize(userId, history._id.toString(), prize as unknown as ISpinPrize);

  return {
    ok: true,
    prize: { title: prize.title, type: prize.type, value: prize.value },
  };
}

async function applyPrize(userId: string, historyId: string, prize: ISpinPrize) {
  const baseKey = `spin:${historyId}`;

  switch (prize.type) {
    case "wallet_credit":
      if (prize.value > 0) {
        await credit({
          userId,
          amount: prize.value,
          type: "spin_reward",
          idempotencyKey: `${baseKey}:wallet`,
          ref: { kind: "SpinHistory", item: historyId as never },
          description: `جایزه گردونه: ${prize.title}`,
          notify: {
            title: "جایزه گردونه شانس",
            message: `مبلغ ${prize.value.toLocaleString("fa-IR")} تومان از گردونه شانس به کیف پول شما اضافه شد.`,
          },
        });
      }
      break;

    case "xp":
      if (prize.value > 0) {
        await grantXp({
          userId,
          amount: prize.value,
          reason: "spin",
          idempotencyKey: `${baseKey}:xp`,
          ref: { kind: "SpinHistory", item: historyId },
          description: `جایزه گردونه: ${prize.title}`,
          applyVipMultiplier: false,
        });
      }
      break;

    case "coupon":
      // کوپن جایزه به‌صورت خصوصی به کاربر تخصیص می‌یابد
      if (prize.coupon) {
        const { default: Coupon } = await import("@/model/Loyalty Club/Coupon");
        await Coupon.updateOne({ _id: prize.coupon }, { $addToSet: { allowedUsers: userId } });
        await Notification.create({
          title: "کد تخفیف گردونه",
          message: `کد تخفیف «${prize.title}» از گردونه شانس برای شما فعال شد.`,
          type: "spin_reward",
          for: "user",
          user: userId,
          target: { kind: "SpinHistory", item: historyId as never },
        }).catch(() => {});
      }
      break;

    case "free_shipping":
    case "special_gift":
      await Notification.create({
        title: "جایزه گردونه شانس",
        message:
          prize.type === "free_shipping"
            ? "شما ارسال رایگان برای سفارش بعدی برنده شدید! هنگام ثبت سفارش اعمال می‌شود."
            : `شما «${prize.title}» برنده شدید! پشتیبانی به‌زودی با شما تماس می‌گیرد.`,
        type: "spin_reward",
        for: "user",
        user: userId,
        target: { kind: "SpinHistory", item: historyId as never },
      }).catch(() => {});
      break;

    case "nothing":
    default:
      break;
  }

  await SpinHistory.updateOne({ _id: historyId }, { $set: { applied: true } });
}

/** آیا امروز چرخیده؟ + تاریخچه اخیر */
export async function getSpinStatus(userId: string) {
  const today = dayKey();
  const [todaySpin, history] = await Promise.all([
    SpinHistory.findOne({ user: userId, dayKey: today }).lean(),
    SpinHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return { canSpin: !todaySpin, todaySpin, history };
}
