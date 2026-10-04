"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Gamepad2, Loader2, MapPin, RefreshCw, Wrench } from "lucide-react";

type Appointment = {
  _id: string;
  trackingCode: string;
  serviceType: "game_install" | "repair";
  device: string;
  installationType?: "account" | "copy" | null;
  repairIssue?: string | null;
  description?: string;
  startsAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "rejected";
  pricing?: { known: boolean; baseAmount?: number | null; discountAmount: number; finalAmount?: number | null };
};

type LegacyOrder = {
  _id: string;
  products: Array<{ name: string; platform?: string }>;
  status: string;
  createdAt: string;
  totalPrice?: number;
};

const statusLabel: Record<string, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  no_show: "bg-orange-50 text-orange-700 border-orange-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const devices: Record<string, string> = {
  ps5: "PlayStation 5",
  ps4: "PlayStation 4",
  "xbox-series": "Xbox Series",
  "xbox-one": "Xbox One",
};

const issues: Record<string, string> = {
  power: "روشن‌نشدن",
  display: "مشکل تصویر",
  controller: "دسته",
  sound: "صدا",
  overheating: "داغ‌شدن",
  other: "سایر",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export default function MyGameOrders() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [legacy, setLegacy] = useState<LegacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [appointmentsResponse, legacyResponse] = await Promise.all([
        fetch("/api/profile/appointments", { cache: "no-store" }),
        fetch("/api/profile/customer-game-orders", { cache: "no-store" }),
      ]);
      if (!appointmentsResponse.ok) throw new Error("دریافت نوبت‌ها انجام نشد.");
      const appointmentsData = await appointmentsResponse.json();
      setAppointments(Array.isArray(appointmentsData.appointments) ? appointmentsData.appointments : []);
      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        setLegacy(Array.isArray(legacyData) ? legacyData : []);
      }
    } catch {
      setError("دریافت نوبت‌ها با مشکل مواجه شد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (appointmentId: string) => {
    setWorking(appointmentId);
    try {
      const response = await fetch("/api/profile/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", appointmentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "لغو نوبت انجام نشد.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "لغو نوبت انجام نشد.");
    } finally {
      setWorking("");
    }
  };

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت نوبت‌ها…</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">نوبت‌های نصب و تعمیرات</h2>
          <p className="mt-1 text-xs text-slate-500">زمان‌ها بر اساس منطقه زمانی تهران نمایش داده می‌شوند.</p>
        </div>
        <Link href="/my-profile?step=6" className="rounded-xl bg-[#001A6E] px-4 py-2.5 text-sm font-bold text-white">دریافت نوبت</Link>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 font-bold"><RefreshCw className="h-4 w-4" /> تلاش دوباره</button>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-bold text-slate-800">هنوز نوبتی ثبت نکرده‌اید</p>
          <p className="mt-1 text-sm text-slate-500">برای نصب بازی یا پذیرش تعمیرات، یک زمان آزاد انتخاب کنید.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {appointments.map((item) => {
            const ServiceIcon = item.serviceType === "repair" ? Wrench : Gamepad2;
            const cancellable = ["pending", "confirmed"].includes(item.status) && new Date(item.startsAt) > new Date();
            return (
              <article key={item._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-blue-100 p-2 text-[#001A6E]"><ServiceIcon className="h-5 w-5" /></span>
                    <div>
                      <h3 className="font-black text-slate-900">{item.serviceType === "repair" ? "پذیرش تعمیرات" : "نصب بازی"}</h3>
                      <p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{item.trackingCode}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
                </header>
                <div className="space-y-3 p-4 text-sm">
                  <p className="flex items-start gap-2 text-slate-700"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#001A6E]" /><strong>{dateTime(item.startsAt)}</strong></p>
                  <p className="text-slate-600">دستگاه: <strong className="text-slate-900">{devices[item.device] || item.device}</strong></p>
                  {item.installationType && <p className="text-slate-600">نوع نصب: <strong className="text-slate-900">{item.installationType === "copy" ? "کپی‌خور" : "اکانتی / قانونی"}</strong></p>}
                  {item.repairIssue && <p className="text-slate-600">مشکل: <strong className="text-slate-900">{issues[item.repairIssue] || item.repairIssue}</strong></p>}
                  {item.description && <p className="rounded-xl bg-slate-50 p-3 leading-6 text-slate-600">{item.description}</p>}
                  <p className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-6 text-blue-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> خیابان ناصریه بین کوچه ۲ و ۴ نبش داروخانه مادر</p>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      {item.pricing?.known
                        ? `مبلغ نهایی: ${(item.pricing.finalAmount || 0).toLocaleString("fa-IR")} تومان`
                        : "هزینه پس از بررسی مشخص می‌شود"}
                    </span>
                    {cancellable && (
                      <button type="button" disabled={working === item._id} onClick={() => void cancel(item._id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">
                        {working === item._id ? "در حال لغو…" : "لغو نوبت"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {legacy.length > 0 && (
        <details className="rounded-3xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-black text-slate-800">سفارش‌های قدیمی نصب بازی ({legacy.length.toLocaleString("fa-IR")})</summary>
          <p className="mt-2 text-xs text-slate-500">این سوابق برای سازگاری حفظ شده‌اند و به نوبت جدید تبدیل نشده‌اند.</p>
          <div className="mt-4 space-y-3">
            {legacy.map((order) => (
              <article key={order._id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3"><strong>#{order._id.slice(-6).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span></div>
                <p className="mt-2 text-slate-600">{order.products.map((product) => product.name).join("، ")}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
