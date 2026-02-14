"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "نمای کلی داشبورد",
  "/dashboard/products": "مدیریت محصولات",
  "/dashboard/orders": "سفارشات فروشگاه",
  "/dashboard/store-order": "سفارشات دستی",
  "/dashboard/users": "مدیریت کاربران",
  "/dashboard/inbox": "پیام‌ها و اعلان‌ها",
  "/dashboard/blogs": "مدیریت وبلاگ",
};

export default function DashboardTopbar() {
  const pathname = usePathname();

  const title = useMemo(() => {
    if (pathname.startsWith("/dashboard/store-order/all-orders")) {
      return "همه سفارشات دستی";
    }

    if (pathname.startsWith("/dashboard/store-order/all-gamelist")) {
      return "لیست بازی‌ها";
    }

    return pageTitles[pathname] || "پنل مدیریت";
  }, [pathname]);

  const today = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <header className="dashboard-topbar">
      <div className="flex items-center gap-3 text-slate-700">
        <span className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-slate-500">پنل مدیریت کرمان آتاری</p>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
        <CalendarDays className="h-4 w-4 text-indigo-600" />
        <span>{today}</span>
      </div>
    </header>
  );
}
