"use client";
// app/(public)/my-profile/MyLoyalty.tsx
// باشگاه مشتریان: XP و سطح، VIP، ماموریت‌ها، نشان‌ها، زنجیره ورود، کد دعوت و تاریخچه XP
import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
  Award,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Flame,
  Gift,
  Sparkles,
  Target,
} from "lucide-react";
import { toPersianDate } from "@/helpers/toPersianDate";
import { apiFetch, faNum, toman, Paged, XP_REASON_FA } from "@/lib/loyalty/ui";
import {
  LevelCode,
  LEVEL_FA,
  MissionMetric,
  MissionPeriod,
  VipTier,
  VIP_TIER_FA,
  XpReason,
} from "@/types/loyalty";

// ---------- انواع داده ----------

interface LoyaltyDashboard {
  wallet: { balance: number };
  experience: {
    totalXp: number;
    monthlyXp: number;
    level: LevelCode;
    levelTitle: string;
    nextLevel: { code: LevelCode; title: string; minXp: number; remaining: number } | null;
  };
  vip: { tier: VipTier | null; tierTitle: string | null };
  stats: { totalPurchase: number; successfulOrders: number };
  streak: { currentStreak: number; longestStreak: number; activeToday: boolean };
  referral: { code: string; totalInvited: number; successful: number; totalEarned: number };
}

interface MissionItem {
  _id: string;
  title: string;
  description?: string;
  period: MissionPeriod;
  metric: MissionMetric;
  target: number;
  reward: { xp: number; walletCredit: number };
  periodKey: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
}

interface AchievementItem {
  _id: string;
  snapshot: { code: string; title: string; icon?: string };
  createdAt: string;
}

interface XpHistoryItem {
  _id: string;
  amount: number;
  reason: XpReason;
  description?: string;
  createdAt: string;
}

const PERIOD_FA: Record<MissionPeriod, string> = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  once: "یک‌بار",
};

const METRIC_UNIT: Record<MissionMetric, string> = {
  purchase_count: "خرید",
  purchase_amount: "تومان",
  review_count: "نظر",
  referral_count: "دعوت",
  login_days: "روز",
};

const VIP_CLASS: Record<VipTier, string> = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-slate-500 to-slate-300",
  gold: "from-yellow-500 to-amber-300",
  diamond: "from-cyan-500 to-sky-300",
};

export default function MyLoyalty() {
  const [dash, setDash] = useState<LoyaltyDashboard | null>(null);
  const [missions, setMissions] = useState<MissionItem[] | null>(null);
  const [badges, setBadges] = useState<AchievementItem[] | null>(null);
  const [xpHistory, setXpHistory] = useState<Paged<XpHistoryItem> | null>(null);
  const [xpPage, setXpPage] = useState(1);
  const [claiming, setClaiming] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [d, m, b] = await Promise.all([
      apiFetch<LoyaltyDashboard>("/api/loyalty"),
      apiFetch<MissionItem[]>("/api/loyalty/missions"),
      apiFetch<AchievementItem[]>("/api/loyalty/achievements"),
    ]);
    if (d.ok && d.data) setDash(d.data);
    else if (d.error) toast.error(d.error);
    if (m.ok && m.data) setMissions(m.data);
    if (b.ok && b.data) setBadges(b.data);
  }, []);

  const loadXpHistory = useCallback(async () => {
    const res = await apiFetch<Paged<XpHistoryItem>>(
      `/api/loyalty/xp-history?page=${xpPage}&limit=8`,
    );
    if (res.ok && res.data) setXpHistory(res.data);
  }, [xpPage]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);
  useEffect(() => {
    loadXpHistory();
  }, [loadXpHistory]);

  // دریافت پاداش ماموریت تکمیل‌شده
  const claim = async (mission: MissionItem) => {
    if (claiming) return;
    setClaiming(mission._id);
    const res = await apiFetch<{ claimed: boolean }>("/api/loyalty/missions/claim", {
      method: "POST",
      body: JSON.stringify({ missionId: mission._id, periodKey: mission.periodKey }),
    });
    setClaiming(null);
    if (res.ok) {
      toast.success("پاداش ماموریت دریافت شد");
      loadAll();
      loadXpHistory();
    } else {
      toast.error(res.error ?? "خطا در دریافت پاداش");
    }
  };

  const copyReferral = async () => {
    if (!dash?.referral.code) return;
    try {
      const referralLink = `${window.location.origin}/auth/login?ref=${encodeURIComponent(dash.referral.code)}`;
      await navigator.clipboard.writeText(referralLink);
      toast.success("لینک دعوت کپی شد");
    } catch {
      toast.error("کپی ناموفق بود");
    }
  };

  const xp = dash?.experience;
  const levelProgress =
    xp && xp.nextLevel
      ? Math.min(
          100,
          Math.round(
            ((xp.totalXp - (xp.nextLevel.minXp - xp.nextLevel.remaining)) /
              (xp.nextLevel.minXp - (xp.nextLevel.minXp - xp.nextLevel.remaining) || 1)) *
              100,
          ),
        )
      : 100;

  return (
    <section className="space-y-5">
      {/* ردیف کارت‌های وضعیت */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* سطح و XP */}
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <span className="text-sm text-slate-500">سطح شما</span>
            </div>
            {xp ? (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {xp.levelTitle}
              </span>
            ) : (
              <Skeleton width={70} height={22} />
            )}
          </div>
          {xp ? (
            <>
              <p className="mt-3 text-2xl font-bold text-slate-800">
                {faNum(xp.totalXp)} <span className="text-sm font-normal text-slate-400">امتیاز</span>
              </p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {xp.nextLevel
                  ? `${faNum(xp.nextLevel.remaining)} امتیاز تا سطح «${xp.nextLevel.title}»`
                  : "شما در بالاترین سطح هستید 🎉"}
              </p>
            </>
          ) : (
            <Skeleton count={3} className="mt-3" />
          )}
        </div>

        {/* VIP */}
        <div
          className={`rounded-2xl border border-slate-200 p-5 text-white shadow-sm ${
            dash?.vip.tier
              ? `bg-gradient-to-l ${VIP_CLASS[dash.vip.tier]}`
              : "bg-gradient-to-l from-slate-600 to-slate-400"
          }`}
        >
          <div className="flex items-center gap-2 text-white/80">
            <Crown className="h-5 w-5" />
            <span className="text-sm">عضویت VIP</span>
          </div>
          <p className="mt-3 text-xl font-bold">
            {dash ? dash.vip.tierTitle ?? "عضو عادی" : <Skeleton width={80} baseColor="#94a3b8" />}
          </p>
          <p className="mt-1 text-xs text-white/70">
            مجموع خرید: {dash ? toman(dash.stats.totalPurchase) : "…"}
          </p>
        </div>

        {/* زنجیره ورود */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm">زنجیره ورود</span>
          </div>
          <p className="mt-3 text-xl font-bold text-slate-800">
            {dash ? `${faNum(dash.streak.currentStreak)} روز` : <Skeleton width={70} />}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dash
              ? dash.streak.activeToday
                ? `ورود امروز ثبت شده — رکورد: ${faNum(dash.streak.longestStreak)} روز`
                : "امروز هنوز وارد نشده‌اید"
              : "…"}
          </p>
        </div>
      </div>

      {/* کارت‌های کوچک آمار */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="موجودی کیف پول" value={dash ? toman(dash.wallet.balance) : null} />
        <StatCard label="امتیاز این ماه" value={dash ? faNum(dash.experience.monthlyXp) : null} />
        <StatCard label="سفارش‌های موفق" value={dash ? faNum(dash.stats.successfulOrders) : null} />
        <StatCard label="درآمد از دعوت" value={dash ? toman(dash.referral.totalEarned) : null} />
      </div>

      {/* دعوت از دوستان */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50 to-violet-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-3 shadow-sm">
              <Gift className="h-6 w-6 text-indigo-600" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800">دعوت از دوستان</h3>
              <p className="text-xs text-slate-500">
                با اولین خرید دوست شما، هر دو هدیه دریافت می‌کنید — تاکنون{" "}
                {dash ? faNum(dash.referral.successful) : "…"} دعوت موفق
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold tracking-widest text-indigo-700">
              {dash ? dash.referral.code : <Skeleton width={90} />}
            </code>
            <button
              type="button"
              onClick={copyReferral}
              className="rounded-xl bg-indigo-600 p-2.5 text-white transition hover:bg-indigo-700"
              title="کپی کد دعوت"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ماموریت‌ها */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Target className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">ماموریت‌ها</h3>
        </div>
        {!missions ? (
          <Skeleton count={3} height={64} className="mb-3" />
        ) : missions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">ماموریت فعالی وجود ندارد</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {missions.map((m) => {
              const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
              return (
                <div
                  key={m._id}
                  className={`rounded-xl border p-4 ${
                    m.completed ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{m.title}</p>
                      {m.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{m.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {PERIOD_FA[m.period]}
                    </span>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        m.completed ? "bg-emerald-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {faNum(m.progress)} از {faNum(m.target)} {METRIC_UNIT[m.metric]}
                    </span>
                    <span className="text-indigo-600">
                      پاداش: {m.reward.xp > 0 && `${faNum(m.reward.xp)} XP`}
                      {m.reward.xp > 0 && m.reward.walletCredit > 0 && " + "}
                      {m.reward.walletCredit > 0 && toman(m.reward.walletCredit)}
                    </span>
                  </div>

                  {m.completed && (
                    <button
                      type="button"
                      disabled={m.rewardClaimed || claiming === m._id}
                      onClick={() => claim(m)}
                      className={`mt-3 w-full rounded-lg py-2 text-xs font-medium transition ${
                        m.rewardClaimed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      } disabled:opacity-70`}
                    >
                      {m.rewardClaimed
                        ? "پاداش دریافت شده ✓"
                        : claiming === m._id
                          ? "در حال دریافت…"
                          : "دریافت پاداش"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نشان‌ها + تاریخچه XP */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BadgeCheck className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800">نشان‌های من</h3>
          </div>
          {!badges ? (
            <Skeleton count={2} height={48} className="mb-2" />
          ) : badges.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              هنوز نشانی کسب نکرده‌اید — با خرید و فعالیت، نشان بگیرید!
            </p>
          ) : (
            <ul className="space-y-2">
              {badges.map((b) => (
                <li
                  key={b._id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <span className="rounded-lg bg-amber-100 p-2">
                    <Award className="h-5 w-5 text-amber-600" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{b.snapshot.title}</p>
                    <p className="text-xs text-slate-400">{toPersianDate(b.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">تاریخچه امتیازها</h3>
          </div>
          {!xpHistory ? (
            <Skeleton count={4} height={36} className="mb-2" />
          ) : xpHistory.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">سابقه‌ای ثبت نشده است</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-50">
                {xpHistory.items.map((h) => (
                  <li key={h._id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="text-slate-700">{h.description || XP_REASON_FA[h.reason]}</p>
                      <p className="text-xs text-slate-400">{toPersianDate(h.createdAt)}</p>
                    </div>
                    <span
                      className={`font-bold ${h.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {h.amount >= 0 ? "+" : ""}
                      {faNum(h.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {xpHistory.pages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={xpPage <= 1}
                    onClick={() => setXpPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
                    title="قبل"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500">
                    {faNum(xpPage)} / {faNum(xpHistory.pages)}
                  </span>
                  <button
                    type="button"
                    disabled={xpPage >= xpHistory.pages}
                    onClick={() => setXpPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
                    title="بعد"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-800">
        {value === null ? <Skeleton width={70} /> : value}
      </p>
    </div>
  );
}
