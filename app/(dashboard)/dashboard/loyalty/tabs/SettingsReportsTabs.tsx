"use client";
// app/(dashboard)/dashboard/loyalty/tabs/SettingsReportsTabs.tsx
// تنظیمات سراسری باشگاه مشتریان + گزارش‌های مدیریتی
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Save } from "lucide-react";
import { apiFetch, faNum, toman } from "@/lib/loyalty/ui";
import { AdminTable, Field, inputCls, Td, Toggle } from "../components";

// ================= تنظیمات =================

interface Settings {
  xp: {
    signup: number;
    firstPurchase: number;
    purchasePer10k: number;
    review: number;
    consecutivePurchase: number;
    referral: number;
    dailyLogin: number;
    campaignParticipation: number;
  };
  cashback: { defaultPercent: number; enabled: boolean };
  referral: { referrerReward: number; refereeReward: number; minFirstPurchase: number };
  loginStreak: { dailyXpRewards: number[]; daySevenWalletReward: number };
  spin: { enabled: boolean; extraSpinCost: number };
  wallet: { minCharge: number; maxCharge: number; giftExpiryDays: number };
}

const XP_LABELS: Record<keyof Settings["xp"], string> = {
  signup: "ثبت‌نام",
  firstPurchase: "اولین خرید",
  purchasePer10k: "هر ۱۰ هزار تومان خرید",
  review: "ثبت نظر",
  consecutivePurchase: "خرید متوالی",
  referral: "دعوت موفق",
  dailyLogin: "ورود روزانه",
  campaignParticipation: "شرکت در کمپین",
};

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<Settings>("/api/admin/loyalty/settings");
    if (res.ok && res.data) setSettings(res.data);
    else if (res.error) toast.error(res.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return <p className="py-10 text-center text-slate-500">در حال بارگذاری…</p>;

  const setXp = (k: keyof Settings["xp"], v: number) =>
    setSettings({ ...settings, xp: { ...settings.xp, [k]: v } });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const res = await apiFetch("/api/admin/loyalty/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success("تنظیمات ذخیره شد");
    else toast.error(res.error ?? "خطا در ذخیره");
  };

  return (
    <div className="space-y-5">
      {/* مقادیر XP */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">مقادیر امتیاز (XP)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(XP_LABELS) as (keyof Settings["xp"])[]).map((k) => (
            <Field key={k} label={XP_LABELS[k]}>
              <input
                type="number"
                min={0}
                value={settings.xp[k]}
                onChange={(e) => setXp(k, Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* کش‌بک و رفرال */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800">کش‌بک</h3>
            <div className="flex items-end gap-4">
              <Field label="درصد پیش‌فرض">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settings.cashback.defaultPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cashback: { ...settings.cashback, defaultPercent: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Toggle
                checked={settings.cashback.enabled}
                onChange={(v) =>
                  setSettings({ ...settings, cashback: { ...settings.cashback, enabled: v } })
                }
                label="فعال"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800">دعوت از دوستان</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="پاداش معرف (تومان)">
                <input
                  type="number"
                  min={0}
                  value={settings.referral.referrerReward}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      referral: { ...settings.referral, referrerReward: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="هدیه کاربر جدید">
                <input
                  type="number"
                  min={0}
                  value={settings.referral.refereeReward}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      referral: { ...settings.referral, refereeReward: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="حداقل اولین خرید">
                <input
                  type="number"
                  min={0}
                  value={settings.referral.minFirstPurchase}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      referral: { ...settings.referral, minFirstPurchase: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* زنجیره، گردونه، کیف پول */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800">زنجیره ورود روزانه (XP روز ۱ تا ۷)</h3>
            <div className="grid grid-cols-7 gap-2">
              {settings.loginStreak.dailyXpRewards.map((v, i) => (
                <Field key={i} label={`روز ${faNum(i + 1)}`}>
                  <input
                    type="number"
                    min={0}
                    value={v}
                    onChange={(e) => {
                      const arr = [...settings.loginStreak.dailyXpRewards];
                      arr[i] = Number(e.target.value);
                      setSettings({
                        ...settings,
                        loginStreak: { ...settings.loginStreak, dailyXpRewards: arr },
                      });
                    }}
                    className={`${inputCls} px-2 text-center`}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-3">
              <Field label="پاداش کیف پول روز هفتم (تومان)">
                <input
                  type="number"
                  min={0}
                  value={settings.loginStreak.daySevenWalletReward}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      loginStreak: {
                        ...settings.loginStreak,
                        daySevenWalletReward: Number(e.target.value),
                      },
                    })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-800">گردونه شانس</h3>
              <Toggle
                checked={settings.spin.enabled}
                onChange={(v) =>
                  setSettings({ ...settings, spin: { ...settings.spin, enabled: v } })
                }
                label="فعال"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-800">انقضای هدیه (روز)</h3>
              <input
                type="number"
                min={0}
                value={settings.wallet.giftExpiryDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    wallet: { ...settings.wallet, giftExpiryDays: Number(e.target.value) },
                  })
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">۰ = بدون انقضا</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
      </button>
    </div>
  );
}

// ================= گزارش‌ها =================

const REPORTS = [
  { key: "top-buyers", label: "بیشترین خریداران" },
  { key: "ltv", label: "ارزش طول عمر مشتری (LTV)" },
  { key: "active-users", label: "کاربران فعال" },
  { key: "cashback", label: "کش‌بک پرداخت‌شده" },
  { key: "wallet-usage", label: "استفاده از کیف پول" },
  { key: "vip", label: "کاربران VIP" },
  { key: "referral", label: "عملکرد معرفی دوستان" },
] as const;

export function ReportsTab() {
  const [report, setReport] = useState<string>("top-buyers");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<unknown>(`/api/admin/loyalty/reports?report=${report}`);
    if (res.ok) setData(res.data ?? null);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, [report]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setReport(r.key)}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              report === r.key
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-500">در حال بارگذاری گزارش…</p>
      ) : (
        <ReportBody report={report} data={data} />
      )}
    </div>
  );
}

function ReportBody({ report, data }: { report: string; data: unknown }) {
  if (data == null) return <p className="py-10 text-center text-slate-500">داده‌ای یافت نشد</p>;

  // --- بیشترین خریداران: آرایه‌ای از کاربران ---
  if (report === "top-buyers" && Array.isArray(data)) {
    const rows = data as Record<string, unknown>[];
    return (
      <AdminTable headers={["کاربر", "موبایل", "مجموع خرید", "سفارش موفق", "VIP"]} empty={rows.length === 0}>
        {rows.map((u, i) => (
          <tr key={i}>
            <Td className="font-medium text-slate-800">{String(u.username ?? "—")}</Td>
            <Td className="font-mono text-xs">{String(u.mobile ?? "—")}</Td>
            <Td>{toman(Number(u.totalPurchase ?? 0))}</Td>
            <Td>{faNum(Number(u.successfulOrders ?? 0))}</Td>
            <Td className="text-xs">{String(u.vipTier ?? "—")}</Td>
          </tr>
        ))}
      </AdminTable>
    );
  }

  // --- کاربران فعال: { items, totalActive } ---
  if (report === "active-users" && !Array.isArray(data)) {
    const { items = [], totalActive = 0 } = data as {
      items?: Record<string, unknown>[];
      totalActive?: number;
    };
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          تعداد کاربران فعال این ماه: <b className="text-slate-800">{faNum(totalActive)}</b>
        </p>
        <AdminTable headers={["کاربر", "امتیاز ماه", "مجموع امتیاز", "سطح"]} empty={items.length === 0}>
          {items.map((u, i) => {
            const user = (u.user ?? {}) as Record<string, string>;
            return (
              <tr key={i}>
                <Td className="font-medium text-slate-800">{user.username ?? user.mobile ?? "—"}</Td>
                <Td>{faNum(Number(u.monthlyXp ?? 0))}</Td>
                <Td>{faNum(Number(u.totalXp ?? 0))}</Td>
                <Td className="text-xs">{String(u.level ?? "—")}</Td>
              </tr>
            );
          })}
        </AdminTable>
      </div>
    );
  }

  // --- کش‌بک: { total, count, monthly[] } ---
  if (report === "cashback" && !Array.isArray(data)) {
    const { total = 0, count = 0, monthly = [] } = data as {
      total?: number;
      count?: number;
      monthly?: { _id: string; total: number }[];
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="مجموع کش‌بک پرداخت‌شده" value={toman(total)} />
          <StatCard label="تعداد تراکنش کش‌بک" value={faNum(count)} />
        </div>
        <AdminTable headers={["ماه", "مبلغ"]} empty={monthly.length === 0}>
          {monthly.map((m) => (
            <tr key={m._id}>
              <Td className="font-mono text-xs"><span dir="ltr">{m._id}</span></Td>
              <Td>{toman(m.total)}</Td>
            </tr>
          ))}
        </AdminTable>
      </div>
    );
  }

  // --- استفاده از کیف پول: آرایه [{ _id: type, total, count }] ---
  if (report === "wallet-usage" && Array.isArray(data)) {
    const rows = data as { _id: string; total: number; count: number }[];
    return (
      <AdminTable headers={["نوع تراکنش", "تعداد", "مجموع مبلغ"]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r._id}>
            <Td className="font-medium text-slate-800">{TYPE_LABELS[r._id] ?? r._id}</Td>
            <Td>{faNum(r.count)}</Td>
            <Td>{toman(r.total)}</Td>
          </tr>
        ))}
      </AdminTable>
    );
  }

  // --- VIP: آرایه [{ _id: tier, count }] ---
  if (report === "vip" && Array.isArray(data)) {
    const rows = data as { _id: string; count: number }[];
    return (
      <AdminTable headers={["سطح VIP", "تعداد کاربر"]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r._id}>
            <Td className="font-medium text-slate-800">{VIP_LABELS[r._id] ?? r._id}</Td>
            <Td>{faNum(r.count)}</Td>
          </tr>
        ))}
      </AdminTable>
    );
  }

  // --- رفرال: { total, rewarded, totalPaid, topReferrers[] } ---
  if (report === "referral" && !Array.isArray(data)) {
    const { total = 0, rewarded = 0, totalPaid = 0, topReferrers = [] } = data as {
      total?: number;
      rewarded?: number;
      totalPaid?: number;
      topReferrers?: { _id: string; count: number; earned: number; user?: { username?: string; mobile?: string } }[];
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="کل دعوت‌ها" value={faNum(total)} />
          <StatCard label="دعوت موفق" value={faNum(rewarded)} />
          <StatCard label="پاداش پرداخت‌شده" value={toman(totalPaid)} />
        </div>
        <AdminTable headers={["معرف", "دعوت موفق", "درآمد"]} empty={topReferrers.length === 0}>
          {topReferrers.map((r) => (
            <tr key={r._id}>
              <Td className="font-medium text-slate-800">
                {r.user?.username ?? r.user?.mobile ?? "—"}
              </Td>
              <Td>{faNum(r.count)}</Td>
              <Td>{toman(r.earned)}</Td>
            </tr>
          ))}
        </AdminTable>
      </div>
    );
  }

  // --- LTV: آبجکت تخت ---
  if (!Array.isArray(data)) {
    const obj = data as Record<string, number>;
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(obj).map(([k, v]) => (
          <StatCard key={k} label={METRIC_LABELS[k] ?? k} value={faNum(Math.round(Number(v) || 0))} />
        ))}
      </div>
    );
  }

  return <p className="py-10 text-center text-slate-500">داده‌ای یافت نشد</p>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  charge: "شارژ",
  payment: "پرداخت سفارش",
  refund: "بازگشت وجه",
  cashback: "کش‌بک",
  gift: "هدیه",
  referral_reward: "پاداش معرفی",
  spin_reward: "گردونه",
  mission_reward: "ماموریت",
  expire: "انقضا",
  admin_adjust: "تعدیل مدیر",
};

const VIP_LABELS: Record<string, string> = {
  bronze: "برنزی",
  silver: "نقره‌ای",
  gold: "طلایی",
  diamond: "الماس",
};

const METRIC_LABELS: Record<string, string> = {
  avgLtv: "میانگین LTV (تومان)",
  totalLtv: "مجموع LTV (تومان)",
  buyers: "تعداد خریداران",
  totalUsers: "کل کاربران",
};
