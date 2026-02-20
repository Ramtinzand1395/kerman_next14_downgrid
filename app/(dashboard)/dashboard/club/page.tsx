"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

type ClubData = {
  users: Array<{
    _id: string;
    username?: string;
    mobile: string;
    referralCode?: string;
    referredBy?: string | null;
    loyalty?: {
      pointsBalanceCached?: number;
    };
  }>;
  stats: {
    usersWithReferralCode: number;
    usersReferred: number;
    activeRewards: number;
    pointsSummary: Array<{ _id: string; totalPoints: number; count: number }>;
    referralsByStatus: Array<{ _id: string; count: number }>;
    redemptionByStatus: Array<{ _id: string; count: number }>;
  };
  recentTransactions: Array<{
    _id: string;
    kind: string;
    status: string;
    points: number;
    source: string;
    user?: { username?: string; mobile: string };
    createdAt: string;
  }>;
};

export default function ClubAdminPage() {
  const [data, setData] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/club/overview");
        if (!res.ok) throw new Error("خطا در دریافت اطلاعات باشگاه مشتریان");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
        toast.error("دریافت اطلاعات باشگاه مشتریان ناموفق بود");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const earnSpendText = useMemo(() => {
    const list = data?.stats?.pointsSummary || [];
    const earn = list.find((i) => i._id === "EARN")?.totalPoints || 0;
    const spend = list.find((i) => i._id === "SPEND")?.totalPoints || 0;
    return { earn, spend: Math.abs(spend) };
  }, [data]);

  return (
    <section className="space-y-6 p-4 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-700 to-indigo-700 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">مدیریت باشگاه مشتریان</h1>
        <p className="mt-2 text-sm text-cyan-100">
          آمار امتیازها، معرفی دوستان و وضعیت پاداش‌ها را یکجا مشاهده کنید.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="کاربران دارای کد معرف" value={data?.stats.usersWithReferralCode || 0} loading={loading} />
        <Card title="کاربران معرفی‌شده" value={data?.stats.usersReferred || 0} loading={loading} />
        <Card title="مجموع امتیاز کسب‌شده" value={earnSpendText.earn} loading={loading} />
        <Card title="مجموع امتیاز خرج‌شده" value={earnSpendText.spend} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">کاربران اخیر باشگاه</h2>
          <div className="space-y-2">
            {(data?.users || []).map((user) => (
              <div key={user._id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-800">{user.username || "بدون نام"}</p>
                <p className="text-slate-500">{user.mobile}</p>
                <p className="mt-1 text-xs text-slate-600">
                  کد معرف: {user.referralCode || "-"} | امتیاز: {user.loyalty?.pointsBalanceCached || 0}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">تراکنش‌های امتیاز اخیر</h2>
          <div className="space-y-2">
            {(data?.recentTransactions || []).map((item) => (
              <div key={item._id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-800">
                  {item.user?.username || item.user?.mobile || "کاربر"} - {item.kind}
                </p>
                <p className="text-slate-500">
                  {item.source} | {item.status} | {item.points}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({
  title,
  value,
  loading,
}: {
  title: string;
  value: number;
  loading: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {loading ? "..." : Number(value).toLocaleString("fa-IR")}
      </p>
    </article>
  );
}
