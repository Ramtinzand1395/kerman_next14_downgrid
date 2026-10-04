"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";

type Progress = {
  ruleId: string;
  title: string;
  completedVisits: number;
  requiredVisits: number;
  remaining: number;
  reward: { type: string; value: number };
};

type Reward = {
  _id: string;
  status: "available" | "reserved" | "redeemed" | "expired" | "revoked";
  expiresAt: string;
  snapshot: { title: string; reward: { type: string; value: number; maxDiscountAmount?: number } };
};

const statusLabel: Record<string, string> = {
  available: "قابل استفاده",
  reserved: "رزروشده برای نوبت",
  redeemed: "استفاده‌شده",
  expired: "منقضی",
  revoked: "باطل‌شده",
};

function rewardText(reward: Reward["snapshot"]["reward"]) {
  if (reward.type === "free_game") return "یک نصب بازی واجد شرایط رایگان";
  if (reward.type === "free_shipping") return "ارسال رایگان (پس از فعال‌شدن پیک)";
  if (reward.type === "percent") return `${reward.value.toLocaleString("fa-IR")}٪ تخفیف`;
  return `${reward.value.toLocaleString("fa-IR")} تومان تخفیف`;
}

export default function VisitRewardsPanel() {
  const [data, setData] = useState<{ validVisits: number; progress: Progress[]; rewards: Reward[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profile/visit-rewards", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "خطا");
        setData(payload.data);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError("اطلاعات پاداش مراجعه دریافت نشد.");
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="rounded-2xl border border-cyan-100 bg-gradient-to-l from-cyan-50 to-blue-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white p-3 text-[#001A6E] shadow-sm"><Gift className="h-6 w-6" /></span>
          <div>
            <h3 className="font-black text-slate-900">پاداش مراجعه</h3>
            <p className="mt-1 text-xs text-slate-500">فقط خدمات آنلاین انجام‌شده و تأییدشده توسط مدیر شمرده می‌شوند.</p>
          </div>
        </div>
        {data && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#001A6E]">{data.validVisits.toLocaleString("fa-IR")} مراجعه معتبر</span>}
      </div>
      {!data && !error ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال محاسبه…</div>
      ) : error ? (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm text-rose-600">{error}</p>
      ) : (
        <>
          {data!.progress.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white/80 p-4 text-sm text-slate-600">هنوز قانون فعال پاداش مراجعه تعریف نشده است.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data!.progress.map((item) => {
                const progress = Math.min(100, Math.round(((item.completedVisits % item.requiredVisits) / item.requiredVisits) * 100));
                return (
                  <article key={item.ruleId} className="rounded-2xl border border-white bg-white/90 p-4">
                    <div className="flex items-center justify-between gap-3"><strong className="text-sm text-slate-800">{item.title}</strong><Sparkles className="h-4 w-4 text-amber-500" /></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-[#001A6E] to-cyan-400" style={{ width: `${progress}%` }} /></div>
                    <p className="mt-2 text-xs font-bold text-[#001A6E]">{item.remaining === 0 ? "شرط این پاداش تکمیل شده است" : `${item.remaining.toLocaleString("fa-IR")} مراجعه دیگر تا پاداش بعدی`}</p>
                  </article>
                );
              })}
            </div>
          )}
          {data!.rewards.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-black text-slate-800">پاداش‌های من</h4>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {data!.rewards.map((reward) => (
                  <article key={reward._id} className="flex items-start gap-3 rounded-xl bg-white p-3">
                    <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${reward.status === "available" ? "text-emerald-500" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{reward.snapshot.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{rewardText(reward.snapshot.reward)} · {statusLabel[reward.status]}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

