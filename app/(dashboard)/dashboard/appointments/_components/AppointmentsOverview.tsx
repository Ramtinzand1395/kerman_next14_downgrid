"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  UserX,
} from "lucide-react";
import type { AppointmentListResponse } from "@/types/appointments";

type Props = {
  summary?: AppointmentListResponse["today"];
  loading: boolean;
  onRefresh: () => void;
};

const cards = [
  { key: "total", label: "نوبت‌های امروز", icon: CalendarDays },
  { key: "pending", label: "در انتظار تأیید", icon: Clock3 },
  { key: "completed", label: "انجام‌شده", icon: CheckCircle2 },
  { key: "noShow", label: "عدم مراجعه", icon: UserX },
  { key: "courierPickups", label: "دریافت پیک امروز", icon: PackageCheck },
  { key: "courierReturns", label: "بازگشت پیک امروز", icon: RotateCcw },
] as const;

export default function AppointmentsOverview({
  summary,
  loading,
  onRefresh,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-[#001A6E] via-[#073897] to-[#1269f5] p-5 text-white shadow-xl shadow-blue-950/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-blue-200">نمای عملیاتی امروز</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            مدیریت دریافت خدمات
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-blue-100 sm:text-sm">
            آمار این بخش مستقیماً از خلاصه واقعی سرور خوانده می‌شود و به صفحه
            جاری جدول وابسته نیست.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          به‌روزرسانی
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ key, label, icon: Icon }) => (
          <article
            key={key}
            className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4 text-cyan-200" />
              <strong className="text-xl font-black">
                {loading && !summary
                  ? "…"
                  : summary
                    ? Number(summary[key]).toLocaleString("fa-IR")
                    : "—"}
              </strong>
            </div>
            <p className="mt-2 text-[11px] font-bold leading-5 text-blue-100">
              {label}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

