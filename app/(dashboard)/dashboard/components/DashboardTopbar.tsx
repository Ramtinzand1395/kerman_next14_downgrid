"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard } from "lucide-react";
import NotificationBell from "@/app/components/notifications/NotificationBell";

const pageTitles: Record<string, string> = {
  "/dashboard": "نمای کلی داشبورد",
  "/dashboard/products": "مدیریت محصولات",
  "/dashboard/orders": "سفارشات فروشگاه",
  "/dashboard/store-order": "سفارشات دستی",
  "/dashboard/users": "مدیریت کاربران",
  "/dashboard/notifications": "مرکز اعلان‌ها",
  "/dashboard/appointments": "مدیریت نوبت‌ها",
  "/dashboard/blogs": "مدیریت وبلاگ",
  "/dashboard/pos-sales": "فروش‌های صندوق",
  "/dashboard/loyalty": "باشگاه مشتریان",
  "/dashboard/shipping": "تنظیمات ارسال",
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
      <div className="flex min-w-0 items-center gap-3 pr-12 sm:pr-0">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-200 bg-lime-100 text-lime-900">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500">کرمان آتاری <span className="mx-1 text-lime-600">/</span> پنل مدیریت</p>
          <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell admin />
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 sm:flex">
          <CalendarDays className="h-4 w-4 text-lime-700" />
          <span>{today}</span>
        </div>
      </div>
    </header>
  );
}
