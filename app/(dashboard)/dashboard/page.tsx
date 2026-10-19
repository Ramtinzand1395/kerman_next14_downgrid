"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import {
  AlertCircle,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardSkeleton from "./components/DashboardSkeleton";

type Section<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: string };
type Distribution = { key: string; count: number }[];
type Point = {
  key: string;
  label: string;
  startInclusive: string;
  endExclusive: string;
  grossPaidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
  paidOrders: number;
  estimatedPaidOrders: number;
  ordersCreated: number;
  manualOrdersAmount: number;
  manualOrdersCount: number;
  gameInstallAppointments: number;
  repairAppointments: number;
};

type DashboardReport = {
  meta: {
    range: string;
    timezone: string;
    startInclusive: string;
    endExclusive: string;
    startJalali: string;
    endJalali: string;
    granularity: "hour" | "day" | "jalali-month";
    generatedAt: string;
    amountUnit: string;
    dateContract: string;
  };
  sections: {
    overview: Section<{
      totals: {
        totalUsers: number;
        totalProducts: number;
        totalInventoryUnits: number;
      };
      rangeCounts: { usersCreated: number; productsCreated: number };
    }>;
    commerce: Section<{
      points: Point[];
      totals: {
        grossPaidAmount: number;
        refundedAmount: number;
        netPaidAmount: number;
        paidOrders: number;
        estimatedPaidAmount: number;
        estimatedPaidOrders: number;
        completedRefunds: number;
        ordersCreated: number;
        netPaidChangePercent: number | null;
        ordersCreatedChangePercent: number | null;
      };
      distributions: { orderStatus: Distribution; paymentStatus: Distribution };
      definitions: Record<string, string>;
    }>;
    manualOrders: Section<{
      points: Point[];
      totals: {
        manualOrdersAmount: number;
        manualOrdersCount: number;
        amountChangePercent: number | null;
      };
      deliveryStatus: Distribution;
      definition: string;
    }>;
    appointments: Section<{
      points: Point[];
      totals: {
        appointmentCount: number;
        gameInstallAppointments: number;
        repairAppointments: number;
        documentedServiceAmount: number;
        knownAmountCount: number;
        unknownAmountCount: number;
        serviceDiscountAmount: number;
        shippingAmount: number;
      };
      distributions: {
        appointmentStatus: Distribution;
        courierStatus: Distribution;
      };
      definition: string;
    }>;
    operations: Section<{
      totals: {
        appointmentsToday: number;
        pendingOrdersCount: number;
        pendingAppointmentsCount: number;
        courierQueueCount: number;
        attentionRows: number;
      };
      upcomingAppointments: Array<Record<string, string>>;
      pendingOrders: Array<Record<string, string | number>>;
      courierQueue: Array<{
        id: string;
        trackingCode: string;
        customerName: string;
        pickupDate: string | null;
        status: string;
        href: string;
      }>;
    }>;
    loyalty: Section<{
      members: number;
      availableVisitRewards: number;
      redeemedVisitRewards: number;
      rewardedReferrals: number;
      href: string;
      definition: string;
    }>;
  };
};

const rangeOptions = [
  { key: "today", label: "امروز" },
  { key: "last7", label: "۷ روز اخیر" },
  { key: "last30", label: "۳۰ روز اخیر" },
  { key: "thisMonth", label: "این ماه" },
  { key: "thisYear", label: "امسال" },
  { key: "custom", label: "دلخواه" },
] as const;

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  paid: "پرداخت‌شده",
  unpaid: "پرداخت‌نشده",
  failed: "ناموفق",
  pending_refund: "در انتظار بازپرداخت",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
  scheduled: "زمان‌بندی‌شده",
  assigned: "اختصاص به پیک",
  picked_up: "دریافت‌شده",
  at_store: "در فروشگاه",
  return_ready: "آماده بازگشت",
  returning: "در مسیر بازگشت",
  unknown: "وضعیت نامشخص",
  آماده: "آماده",
  "تحویل به مشتری": "تحویل به مشتری",
  "دریافت از مشتری": "دریافت از مشتری",
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#6366f1",
  shipped: "#0ea5e9",
  delivered: "#10b981",
  cancelled: "#ef4444",
  paid: "#10b981",
  unpaid: "#94a3b8",
  failed: "#ef4444",
  pending_refund: "#f97316",
  confirmed: "#3b82f6",
  completed: "#10b981",
  no_show: "#f97316",
  rejected: "#e11d48",
  scheduled: "#3b82f6",
  assigned: "#6366f1",
  picked_up: "#06b6d4",
  at_store: "#8b5cf6",
  return_ready: "#d946ef",
  returning: "#0ea5e9",
  unknown: "#64748b",
};

function isReport(value: unknown): value is DashboardReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<DashboardReport>;
  return Boolean(
    report.meta &&
    typeof report.meta.startInclusive === "string" &&
    typeof report.meta.endExclusive === "string" &&
    report.sections &&
    typeof report.sections === "object",
  );
}

function toman(value: number) {
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

function compactAmount(value: number) {
  if (Math.abs(value) >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مـ`;
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} م`;
  if (Math.abs(value) >= 1_000)
    return `${(value / 1_000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} هـ`;
  return value.toLocaleString("fa-IR");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sectionData<T>(section: Section<T>): T | null {
  return section.status === "ok" ? section.data : null;
}

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="dashboard-panel flex min-h-40 flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <AlertCircle className="h-7 w-7 text-rose-500" aria-hidden="true" />
      <p className="text-sm font-bold text-slate-700">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
      >
        تلاش مجدد
      </button>
    </div>
  );
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="text-xs text-slate-400">بازه قبل داده کافی ندارد</span>
    );
  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}
    >
      {positive ? "+" : ""}
      {value.toLocaleString("fa-IR")}٪ نسبت به بازه قبل
    </span>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "indigo",
  href,
}: {
  title: string;
  value: string;
  note?: React.ReactNode;
  icon: typeof Users;
  tone?: "indigo" | "emerald" | "amber" | "rose";
  href?: string;
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  const content = (
    <article className="dashboard-stat-card h-full gap-3 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500 sm:text-sm">{title}</p>
        <p className="mt-2 break-words text-xl font-black text-slate-900 sm:text-2xl">
          {value}
        </p>
        {note && <div className="mt-2">{note}</div>}
      </div>
      <span className={`shrink-0 rounded-2xl p-3 ring-1 ${tones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </article>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function ChartTable({ points }: { points: Point[] }) {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400">
        جدول قابل دسترس داده‌های نمودار
      </summary>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3">بازه</th>
              <th className="p-3">پرداخت ناخالص</th>
              <th className="p-3">بازپرداخت</th>
              <th className="p-3">خالص</th>
              <th className="p-3">سفارش</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.key} className="border-t border-slate-200">
                <td className="p-3 font-bold">{point.label}</td>
                <td className="p-3">{toman(point.grossPaidAmount)}</td>
                <td className="p-3">{toman(point.refundedAmount)}</td>
                <td className="p-3">{toman(point.netPaidAmount)}</td>
                <td className="p-3">
                  {point.ordersCreated.toLocaleString("fa-IR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DistributionChart({
  title,
  data,
  onRetry,
}: {
  title: string;
  data: Distribution;
  onRetry: () => void;
}) {
  const chartData = data.map((item) => ({
    ...item,
    name: statusLabels[item.key] || "وضعیت نامشخص",
    color: statusColors[item.key] || statusColors.unknown,
  }));
  if (!chartData.length)
    return (
      <div className="dashboard-panel">
        <h3 className="font-black text-slate-800">{title}</h3>
        <p className="mt-10 text-center text-sm text-slate-500">
          در این بازه رکوردی وجود ندارد.
        </p>
      </div>
    );
  return (
    <div className="dashboard-panel">
      <h3 className="font-black text-slate-800">{title}</h3>
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            innerRadius={55}
            outerRadius={88}
            paddingAngle={2}
          >
            {chartData.map((item) => (
              <Cell key={item.key} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [
              `${Number(value || 0).toLocaleString("fa-IR")} مورد`,
              "تعداد",
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <ul className="sr-only">
        {chartData.map((item) => (
          <li key={item.key}>
            {item.name}: {item.count.toLocaleString("fa-IR")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "last30";
  const urlStart = searchParams.get("start") || "";
  const urlEnd = searchParams.get("end") || "";
  const [customStart, setCustomStart] = useState(urlStart);
  const [customEnd, setCustomEnd] = useState(urlEnd);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [reportKey, setReportKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestSequence = useRef(0);

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    query.set("range", range);
    if (range === "custom") {
      if (urlStart) query.set("start", urlStart);
      if (urlEnd) query.set("end", urlEnd);
    }
    return query.toString();
  }, [range, urlEnd, urlStart]);

  const fetchReport = useCallback(
    async (signal: AbortSignal, sequence: number) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/dashboard/statistics?${queryString}`,
          {
            signal,
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );
        const json: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            json && typeof json === "object" && "error" in json
              ? String((json as { error: unknown }).error)
              : "دریافت گزارش ناموفق بود.";
          throw new Error(message);
        }
        if (!isReport(json)) throw new Error("ساختار پاسخ گزارش معتبر نیست.");
        if (sequence !== requestSequence.current) return;
        setReport(json);
        setReportKey(queryString);
      } catch (fetchError) {
        if (signal.aborted || sequence !== requestSequence.current) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "دریافت گزارش ناموفق بود.",
        );
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [queryString],
  );

  useEffect(() => {
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    fetchReport(controller.signal, sequence);
    return () => controller.abort();
  }, [fetchReport, retryVersion]);

  useEffect(() => {
    setCustomStart(urlStart);
    setCustomEnd(urlEnd);
  }, [urlEnd, urlStart]);

  const setRange = (nextRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    if (nextRange === "custom") {
      const start = customStart || report?.meta.startJalali || "";
      const end = customEnd || report?.meta.endJalali || "";
      if (start && end) {
        params.set("start", start);
        params.set("end", end);
        setCustomStart(start);
        setCustomEnd(end);
      }
    } else {
      params.delete("start");
      params.delete("end");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      setError("برای بازهٔ دلخواه، تاریخ شروع و پایان را انتخاب کنید.");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("start", customStart);
    params.set("end", customEnd);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const retry = () => setRetryVersion((value) => value + 1);
  const visibleReport = reportKey === queryString ? report : null;
  const overview = visibleReport
    ? sectionData(visibleReport.sections.overview)
    : null;
  const commerce = visibleReport
    ? sectionData(visibleReport.sections.commerce)
    : null;
  const manualOrders = visibleReport
    ? sectionData(visibleReport.sections.manualOrders)
    : null;
  const appointments = visibleReport
    ? sectionData(visibleReport.sections.appointments)
    : null;
  const operations = visibleReport
    ? sectionData(visibleReport.sections.operations)
    : null;
  const loyalty = visibleReport
    ? sectionData(visibleReport.sections.loyalty)
    : null;

  const combinedPoints = useMemo(() => {
    const basePoints =
      commerce?.points || manualOrders?.points || appointments?.points || [];
    return basePoints.map((point, index) => ({
      ...point,
      grossPaidAmount: commerce?.points[index]?.grossPaidAmount || 0,
      refundedAmount: commerce?.points[index]?.refundedAmount || 0,
      netPaidAmount: commerce?.points[index]?.netPaidAmount || 0,
      paidOrders: commerce?.points[index]?.paidOrders || 0,
      estimatedPaidOrders: commerce?.points[index]?.estimatedPaidOrders || 0,
      ordersCreated: commerce?.points[index]?.ordersCreated || 0,
      manualOrdersAmount: manualOrders?.points[index]?.manualOrdersAmount || 0,
      manualOrdersCount: manualOrders?.points[index]?.manualOrdersCount || 0,
      gameInstallAppointments:
        appointments?.points[index]?.gameInstallAppointments || 0,
      repairAppointments: appointments?.points[index]?.repairAppointments || 0,
    }));
  }, [appointments, commerce, manualOrders]);

  const filterPanel = (
    <section className="dashboard-panel space-y-4" aria-label="فیلتر گزارش">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                مرکز پایش فروشگاه
              </h2>
              <p className="text-sm text-slate-500">
                گزارش هماهنگ فروش، نوبت و عملیات روزانه
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setRange(option.key)}
              aria-pressed={range === option.key}
              className={`min-h-10 rounded-xl px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 ${range === option.key ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"}`}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={retry}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            بروزرسانی
          </button>
        </div>
      </div>
      {range === "custom" && (
        <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>از تاریخ</span>
            <DatePicker
              value={customStart || undefined}
              onChange={(date: DateObject | null) =>
                setCustomStart(date ? date.format("YYYY-MM-DD") : "")
              }
              calendar={persian}
              locale={persianFa}
              format="YYYY-MM-DD"
              calendarPosition="bottom-right"
              inputClass="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500"
              containerStyle={{ width: "100%" }}
            />
          </label>
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>تا تاریخ (شامل این روز)</span>
            <DatePicker
              value={customEnd || undefined}
              onChange={(date: DateObject | null) =>
                setCustomEnd(date ? date.format("YYYY-MM-DD") : "")
              }
              calendar={persian}
              locale={persianFa}
              format="YYYY-MM-DD"
              calendarPosition="bottom-right"
              inputClass="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500"
              containerStyle={{ width: "100%" }}
            />
          </label>
          <button
            onClick={applyCustomRange}
            className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            اعمال بازه
          </button>
        </div>
      )}
      {visibleReport && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <p>
            <strong className="text-slate-700">بازه:</strong>{" "}
            {visibleReport.meta.startJalali} تا {visibleReport.meta.endJalali} ·
            تهران ·{" "}
            {visibleReport.meta.granularity === "hour"
              ? "ساعتی"
              : visibleReport.meta.granularity === "day"
                ? "روزانه"
                : "ماهانه شمسی"}
          </p>
          <p>
            <Clock3 className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
            آخرین دریافت موفق: {formatDateTime(visibleReport.meta.generatedAt)}
          </p>
        </div>
      )}
    </section>
  );

  if (!visibleReport) {
    return (
      <div className="space-y-5">
        {filterPanel}
        {loading && (
          <div
            role="status"
            className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700"
          >
            {report
              ? "در حال دریافت بازهٔ جدید؛ دادهٔ قبلی موقتاً پنهان شده است…"
              : "در حال دریافت گزارش…"}
          </div>
        )}
        {error && <SectionError message={error} onRetry={retry} />}
        {loading && <DashboardSkeleton />}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {filterPanel}
      {loading && (
        <div
          role="status"
          className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700"
        >
          در حال بروزرسانی گزارش…
        </div>
      )}
      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
          role="alert"
        >
          {error}
          <button onClick={retry} className="mr-3 underline">
            تلاش مجدد
          </button>
        </div>
      )}

      <section aria-labelledby="primary-metrics">
        <h2 id="primary-metrics" className="sr-only">
          شاخص‌های اصلی
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {commerce ? (
            <>
              <MetricCard
                title="مبلغ ناخالص سفارش‌های پرداخت‌شده"
                value={toman(commerce.totals.grossPaidAmount)}
                note={
                  <p className="text-xs text-slate-500">
                    همراه ارسال، پس از تخفیف
                  </p>
                }
                icon={CircleDollarSign}
                tone="emerald"
                href="/dashboard/orders"
              />
              <MetricCard
                title="خالص پس از بازپرداخت واقعی"
                value={toman(commerce.totals.netPaidAmount)}
                note={
                  <TrendBadge value={commerce.totals.netPaidChangePercent} />
                }
                icon={WalletCards}
                tone="indigo"
                href="/dashboard/orders"
              />
              <MetricCard
                title="سفارش‌های محصول ثبت‌شده در بازه"
                value={commerce.totals.ordersCreated.toLocaleString("fa-IR")}
                note={
                  <TrendBadge
                    value={commerce.totals.ordersCreatedChangePercent}
                  />
                }
                icon={ShoppingCart}
                tone="amber"
                href="/dashboard/orders"
              />
            </>
          ) : (
            <div className="sm:col-span-2 xl:col-span-3">
              <SectionError
                message={
                  visibleReport.sections.commerce.status === "error"
                    ? visibleReport.sections.commerce.error
                    : "گزارش فروش در دسترس نیست."
                }
                onRetry={retry}
              />
            </div>
          )}
          {operations ? (
            <MetricCard
              title="ردیف‌های نیازمند رسیدگی"
              value={operations.totals.attentionRows.toLocaleString("fa-IR")}
              note={
                <p className="text-xs text-slate-500">سفارش، نوبت و صف پیک</p>
              }
              icon={AlertCircle}
              tone="rose"
            />
          ) : (
            <SectionError
              message="عملیات امروز در دسترس نیست."
              onRetry={retry}
            />
          )}
        </div>
      </section>

      {commerce?.totals.estimatedPaidOrders ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="note"
        >
          <strong>
            {commerce.totals.estimatedPaidOrders.toLocaleString("fa-IR")} سفارش
            قدیمی
          </strong>{" "}
          فاقد `paymentVerifiedAt` است؛ زمان آن‌ها با `createdAt` برآورد شده و
          زمان دقیق پرداخت محسوب نمی‌شود. مبلغ این رکوردها{" "}
          {toman(commerce.totals.estimatedPaidAmount)} است.
        </div>
      ) : null}

      {commerce ? (
        <section className="dashboard-panel" aria-labelledby="commerce-trend">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="commerce-trend"
                className="text-lg font-black text-slate-900"
              >
                روند مبلغ سفارش‌های محصول
              </h2>
              <p className="text-xs text-slate-500">
                خط اصلی: خالص پرداخت‌های ثبت‌شده پس از بازپرداخت‌های تکمیل‌شده
                در همان بازه
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              واحد: تومان
            </span>
          </div>
          <div className="h-[330px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedPoints}
                margin={{ top: 8, right: 2, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={compactAmount}
                  tick={{ fontSize: 11 }}
                  width={62}
                />
                <Tooltip
                  labelFormatter={(label) => `بازه ${label}`}
                  formatter={(value: any, name: any) => [
                    toman(Number(value || 0)),
                    name === "grossPaidAmount"
                      ? "پرداخت ناخالص"
                      : name === "refundedAmount"
                        ? "بازپرداخت واقعی"
                        : "خالص",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "grossPaidAmount"
                      ? "ناخالص پرداخت‌شده"
                      : value === "refundedAmount"
                        ? "بازپرداخت تکمیل‌شده"
                        : "خالص"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="grossPaidAmount"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={combinedPoints.length <= 2}
                />
                <Line
                  type="monotone"
                  dataKey="refundedAmount"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={combinedPoints.length <= 2}
                />
                <Line
                  type="monotone"
                  dataKey="netPaidAmount"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={combinedPoints.length <= 2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartTable points={combinedPoints} />
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {commerce ? (
          <div className="dashboard-panel">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                تعداد سفارش‌های محصول
              </h2>
              <p className="text-xs text-slate-500">
                بر اساس زمان ایجاد سفارش؛ مستقل از وضعیت پرداخت
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={combinedPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis allowDecimals={false} width={42} />
                <Tooltip
                  formatter={(value: any) => [
                    `${Number(value || 0).toLocaleString("fa-IR")} سفارش`,
                    "تعداد",
                  ]}
                />
                <Bar
                  dataKey="ordersCreated"
                  name="سفارش ثبت‌شده"
                  fill="#6366f1"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <SectionError
            message="نمودار سفارش‌ها در دسترس نیست."
            onRetry={retry}
          />
        )}
        {manualOrders ? (
          <div className="dashboard-panel">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                مبلغ سفارش‌های دستی ثبت‌شده
              </h2>
              <p className="text-xs text-amber-700">
                این مبلغ سند وصول یا تسویه ندارد و درآمد واقعی نام‌گذاری نشده
                است.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={combinedPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis tickFormatter={compactAmount} width={60} />
                <Tooltip
                  formatter={(value: any) => [
                    toman(Number(value || 0)),
                    "مبلغ ثبت‌شده",
                  ]}
                />
                <Bar
                  dataKey="manualOrdersAmount"
                  fill="#f59e0b"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-500">
              جمع بازه: {toman(manualOrders.totals.manualOrdersAmount)} ·{" "}
              {manualOrders.totals.manualOrdersCount.toLocaleString("fa-IR")}{" "}
              سفارش
            </p>
          </div>
        ) : (
          <SectionError
            message={
              visibleReport.sections.manualOrders.status === "error"
                ? visibleReport.sections.manualOrders.error
                : "گزارش سفارش دستی در دسترس نیست."
            }
            onRetry={retry}
          />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {appointments ? (
          <div className="dashboard-panel xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                نوبت‌ها به تفکیک خدمت
              </h2>
              <p className="text-xs text-slate-500">
                بر اساس زمان شروع نوبت؛ مبلغ خدمت در این نمودار دخیل نیست.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={combinedPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis allowDecimals={false} width={42} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value || 0).toLocaleString("fa-IR")} نوبت`,
                    name === "gameInstallAppointments" ? "نصب بازی" : "تعمیرات",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "gameInstallAppointments" ? "نصب بازی" : "تعمیرات"
                  }
                />
                <Bar
                  dataKey="gameInstallAppointments"
                  stackId="appointments"
                  fill="#6366f1"
                />
                <Bar
                  dataKey="repairAppointments"
                  stackId="appointments"
                  fill="#14b8a6"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="xl:col-span-2">
            <SectionError message="گزارش نوبت در دسترس نیست." onRetry={retry} />
          </div>
        )}
        {operations ? (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard
              title="نوبت‌های امروز"
              value={operations.totals.appointmentsToday.toLocaleString(
                "fa-IR",
              )}
              icon={CalendarClock}
              tone="indigo"
              href="/dashboard/appointments"
            />
            <MetricCard
              title="سفارش پرداخت‌شده منتظر اقدام"
              value={operations.totals.pendingOrdersCount.toLocaleString(
                "fa-IR",
              )}
              icon={PackageCheck}
              tone="amber"
              href="/dashboard/orders"
            />
            <MetricCard
              title="صف فعال پیک"
              value={operations.totals.courierQueueCount.toLocaleString(
                "fa-IR",
              )}
              icon={Clock3}
              tone="rose"
              href="/dashboard/appointments?tab=courier"
            />
          </div>
        ) : null}
      </section>

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="توزیع وضعیت‌ها"
      >
        {commerce ? (
          <>
            <DistributionChart
              title="وضعیت سفارش‌های محصول"
              data={commerce.distributions.orderStatus}
              onRetry={retry}
            />
            <DistributionChart
              title="وضعیت پرداخت سفارش‌ها"
              data={commerce.distributions.paymentStatus}
              onRetry={retry}
            />
          </>
        ) : null}
        {appointments ? (
          <>
            <DistributionChart
              title="وضعیت نوبت‌ها"
              data={appointments.distributions.appointmentStatus}
              onRetry={retry}
            />
            <DistributionChart
              title="وضعیت صف پیک"
              data={appointments.distributions.courierStatus}
              onRetry={retry}
            />
          </>
        ) : null}
      </section>

      {appointments && (
        <section className="dashboard-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                مبلغ ثبت‌شده خدمات تکمیل‌شده
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                این مبلغ از pricing.serviceFinalAmount می‌آید و چون مدل نوبت سند
                پرداخت ندارد، «وجه دریافت‌شده» نیست؛ ارسال جدا نمایش داده
                می‌شود.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">مبلغ ثبت‌شده</p>
                <p className="mt-1 font-black text-slate-800">
                  {toman(appointments.totals.documentedServiceAmount)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">هزینه ارسال</p>
                <p className="mt-1 font-black text-slate-800">
                  {toman(appointments.totals.shippingAmount)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">تخفیف خدمت</p>
                <p className="mt-1 font-black text-slate-800">
                  {toman(appointments.totals.serviceDiscountAmount)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">مبلغ نامشخص</p>
                <p className="mt-1 font-black text-amber-900">
                  {appointments.totals.unknownAmountCount.toLocaleString(
                    "fa-IR",
                  )}{" "}
                  نوبت
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {operations ? (
        <section
          className="grid gap-4 xl:grid-cols-3"
          aria-labelledby="today-operations"
        >
          <h2 id="today-operations" className="sr-only">
            عملیات امروز
          </h2>
          <div className="dashboard-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900">
                نوبت‌های نزدیک امروز
              </h3>
              <Link
                href="/dashboard/appointments"
                className="text-xs font-bold text-indigo-700 hover:underline"
              >
                مشاهده همه
              </Link>
            </div>
            {operations.upcomingAppointments.length ? (
              <ul className="space-y-2">
                {operations.upcomingAppointments.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <Link
                      href={item.href}
                      className="block focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">
                          {item.customerName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(item.startsAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.serviceType === "game_install"
                          ? "نصب بازی"
                          : "تعمیرات"}{" "}
                        · {statusLabels[item.status] || "وضعیت نامشخص"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                نوبت نزدیک دیگری برای امروز نیست.
              </p>
            )}
          </div>
          <div className="dashboard-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900">
                سفارش‌های منتظر اقدام
              </h3>
              <Link
                href="/dashboard/orders"
                className="text-xs font-bold text-indigo-700 hover:underline"
              >
                مشاهده همه
              </Link>
            </div>
            {operations.pendingOrders.length ? (
              <ul className="space-y-2">
                {operations.pendingOrders.map((item) => (
                  <li
                    key={String(item.id)}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <Link
                      href={String(item.href)}
                      className="block focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">
                          {String(item.trackingCode)}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {toman(Number(item.finalPrice))}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(String(item.createdAt))} ·{" "}
                        {statusLabels[String(item.status)] || "وضعیت نامشخص"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                سفارش پرداخت‌شدهٔ منتظر اقدام وجود ندارد.
              </p>
            )}
          </div>
          <div className="dashboard-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900">صف پیک</h3>
              <Link
                href="/dashboard/appointments?tab=courier"
                className="text-xs font-bold text-indigo-700 hover:underline"
              >
                مشاهده صف
              </Link>
            </div>
            {operations.courierQueue.length ? (
              <ul className="space-y-2">
                {operations.courierQueue.map((item) => (
                  <li
                    key={String(item.id)}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <Link
                      href={String(item.href)}
                      className="block focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">
                          {item.customerName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.pickupDate
                            ? formatDateTime(item.pickupDate)
                            : "زمان نامشخص"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {statusLabels[item.status] || "وضعیت نامشخص"} ·{" "}
                        {item.trackingCode}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                صف فعال پیک خالی است.
              </p>
            )}
          </div>
        </section>
      ) : (
        <SectionError
          message={
            visibleReport.sections.operations.status === "error"
              ? visibleReport.sections.operations.error
              : "عملیات امروز در دسترس نیست."
          }
          onRetry={retry}
        />
      )}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {overview ? (
          <div className="dashboard-panel">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  نمای کلی موجودی و کاربران
                </h2>
                <p className="text-xs text-slate-500">
                  جمع کل از موارد ایجادشده در بازه جدا شده است.
                </p>
              </div>
              <Users className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">کل کاربران</p>
                <p className="mt-2 text-xl font-black">
                  {overview.totals.totalUsers.toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-4">
                <p className="text-xs text-indigo-700">
                  کاربر ایجادشده در بازه
                </p>
                <p className="mt-2 text-xl font-black text-indigo-900">
                  {overview.rangeCounts.usersCreated.toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">کل محصولات</p>
                <p className="mt-2 text-xl font-black">
                  {overview.totals.totalProducts.toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">موجودی ثبت‌شده</p>
                <p className="mt-2 text-xl font-black text-emerald-900">
                  {overview.totals.totalInventoryUnits.toLocaleString("fa-IR")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <SectionError
            message="نمای کلی موجودی در دسترس نیست."
            onRetry={retry}
          />
        )}
        {loyalty ? (
          <Link
            href={loyalty.href}
            className="dashboard-panel block focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-black text-slate-900">
                  باشگاه مشتریان و پاداش مراجعه
                </h2>
                <p className="text-xs text-slate-500">
                  فقط رکوردهای ثبت‌شده در مدل‌های واقعی
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">اعضای VIP</dt>
                <dd className="mt-1 text-lg font-black">
                  {loyalty.members.toLocaleString("fa-IR")}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">پاداش مراجعه قابل استفاده</dt>
                <dd className="mt-1 text-lg font-black">
                  {loyalty.availableVisitRewards.toLocaleString("fa-IR")}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">پاداش مصرف‌شده در بازه</dt>
                <dd className="mt-1 text-lg font-black">
                  {loyalty.redeemedVisitRewards.toLocaleString("fa-IR")}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">دعوت پاداش‌داده‌شده در بازه</dt>
                <dd className="mt-1 text-lg font-black">
                  {loyalty.rewardedReferrals.toLocaleString("fa-IR")}
                </dd>
              </div>
            </dl>
          </Link>
        ) : (
          <SectionError
            message="اطلاعات باشگاه مشتریان در دسترس نیست."
            onRetry={retry}
          />
        )}
      </section>

      <details className="dashboard-panel">
        <summary className="cursor-pointer font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400">
          تعریف و منبع شاخص‌ها
        </summary>
        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <p>
            <strong className="text-slate-800">پرداخت سفارش محصول:</strong>{" "}
            Order.finalPrice؛ شامل کالا پس از تخفیف و shippingCost. تاریخ
            paymentVerifiedAt است و فقط برای داده قدیمی فاقد آن createdAt
            به‌عنوان برآورد استفاده می‌شود.
          </p>
          <p>
            <strong className="text-slate-800">بازپرداخت:</strong> فقط
            WalletTransaction تکمیل‌شده از نوع refund. pending_refund بازپرداخت
            انجام‌شده نیست.
          </p>
          <p>
            <strong className="text-slate-800">سفارش دستی:</strong>{" "}
            StoreOrder.price با تاریخ createdAt؛ بدون سند تسویه و نه درآمد
            وصول‌شده.
          </p>
          <p>
            <strong className="text-slate-800">نوبت:</strong> شمارش بر اساس
            startsAt. قیمت ثبت‌شده و completion اثبات دریافت وجه نیست.
          </p>
          <p>
            <strong className="text-slate-800">مرز تاریخ:</strong>{" "}
            {visibleReport.meta.dateContract} با منطقه زمانی{" "}
            {visibleReport.meta.timezone}. پایان انتخاب‌شده در UI شامل کل روز
            است.
          </p>
          <p>
            <strong className="text-slate-800">واحد:</strong> تمام مبالغ تومان و
            بدون اعشار هستند.
          </p>
        </div>
      </details>
    </div>
  );
}
