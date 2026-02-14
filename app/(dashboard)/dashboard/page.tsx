"use client";

import { formatPrice } from "@/helpers/Price";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { Activity, Package, ShoppingCart, Users } from "lucide-react";

const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e"];

const statusFa: Record<string, string> = {
  cancelled: "لغو شده",
  delivered: "تحویل شده",
  pending: "در انتظار پرداخت",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
};

const paymentFa: Record<string, string> = {
  paid: "پرداخت شده",
  unpaid: "پرداخت نشده",
  failed: "ناموفق",
};

const formatDateFa = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

type StatisticsData = {
  usersCount: number;
  productsCount: number;
  ordersCount: number;
  listOrdersCount: number;
  orderStatus: { _id: string; count: number }[];
  paymentStatus: { _id: string; count: number }[];
};

type RevenuePoint = { label: string; value: number };

type StorePoint = { label: string; value: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [storeOrdersData, setStoreOrdersData] = useState<StorePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("monthly");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [statsRes, revenueRes, storeRes] = await Promise.all([
          fetch(`/api/admin/dashboard/statistics?range=${range}`),
          fetch(`/api/admin/dashboard/revenue?range=${range}`),
          fetch(`/api/admin/dashboard/storerevenue?range=${range}`),
        ]);

        const [statsJson, revenueJson, storeJson] = await Promise.all([
          statsRes.json(),
          revenueRes.json(),
          storeRes.json(),
        ]);

        setStats(statsJson);
        setRevenueData(
          (revenueJson.data || []).map((item: { label: string; value: number }) => ({
            label: formatDateFa(item.label),
            value: item.value,
          }))
        );
        setStoreOrdersData(
          (storeJson.data || []).map((item: { date: string; price: number }) => ({
            label: formatDateFa(item.date),
            value: item.price,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  const rangeLabel = useMemo(() => {
    const today = formatDateFa(new Date().toISOString());
    if (range === "daily") return `امروز: ${today}`;
    if (range === "weekly") return `۷ روز اخیر تا ${today}`;
    if (range === "monthly") return `۳۰ روز اخیر تا ${today}`;
    if (range === "yearly") return `۱۲ ماه اخیر تا ${today}`;
    return "";
  }, [range]);

  const cards = useMemo(
    () => [
      {
        title: "تعداد کاربران",
        value: stats?.usersCount || 0,
        icon: Users,
        color: "from-indigo-500 to-indigo-600",
      },
      {
        title: "تعداد محصولات",
        value: stats?.productsCount || 0,
        icon: Package,
        color: "from-emerald-500 to-emerald-600",
      },
      {
        title: "سفارشات محصول",
        value: stats?.ordersCount || 0,
        icon: ShoppingCart,
        color: "from-amber-500 to-orange-500",
      },
      {
        title: "سفارشات دستی",
        value: stats?.listOrdersCount || 0,
        icon: Activity,
        color: "from-fuchsia-500 to-rose-500",
      },
    ],
    [stats]
  );

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <section className="dashboard-panel flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">نمای کلی عملکرد فروشگاه</h2>
          <p className="text-sm text-slate-500">
            داده‌ها بر اساس بازه زمانی انتخاب‌شده نمایش داده می‌شوند.
          </p>
        </div>

        <select
          title="بازه زمانی"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm"
        >
          <option value="daily">روزانه</option>
          <option value="weekly">هفتگی</option>
          <option value="monthly">ماهانه</option>
          <option value="yearly">سالانه</option>
        </select>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="dashboard-stat-card">
            <div className={`rounded-xl bg-gradient-to-l p-2 text-white ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-800">
                {card.value.toLocaleString("fa-IR")}
              </h3>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="dashboard-panel">
          <h3 className="mb-4 font-bold text-slate-800">وضعیت سفارشات</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={stats.orderStatus.map((item) => ({
                  name: statusFa[item._id] || item._id,
                  value: item.count,
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label
              >
                {stats.orderStatus.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(value) => [`${value} سفارش`, "تعداد"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-panel">
          <h3 className="mb-4 font-bold text-slate-800">وضعیت پرداخت‌ها</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={stats.paymentStatus.map((item) => ({
                name: paymentFa[item._id] || item._id,
                value: item.count,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} پرداخت`, "تعداد"]} />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="dashboard-panel">
          <h3 className="mb-4 font-bold text-slate-800">روند درآمد سفارشات محصول</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => `${formatPrice(Number(value))} تومان`} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-500">{rangeLabel}</p>
        </div>

        <div className="dashboard-panel">
          <h3 className="mb-4 font-bold text-slate-800">درآمد سفارشات دستی</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={storeOrdersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => `${formatPrice(Number(value))} تومان`} />
              <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-500">{rangeLabel}</p>
        </div>
      </section>
    </div>
  );
}
