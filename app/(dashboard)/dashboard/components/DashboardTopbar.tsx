"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Moon, Sun } from "lucide-react";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("kermanatari-admin-theme");
      const next = stored === "dark" ? "dark" : "light";
      setTheme(next);
      document.body.dataset.adminTheme = next;
    } catch {
      document.body.dataset.adminTheme = "light";
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.dataset.adminTheme = next;
    try { window.localStorage.setItem("kermanatari-admin-theme", next); } catch { /* storage unavailable */ }
  };

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
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500">کرمان آتاری <span className="mx-1 text-teal-600">/</span> پنل مدیریت</p>
          <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "فعال کردن حالت روشن داشبورد" : "فعال کردن دارک مود داشبورد"}
          aria-pressed={theme === "dark"} title={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden lg:inline">{theme === "dark" ? "روشن" : "تیره"}</span>
        </button>
        <NotificationBell admin />
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 sm:flex">
          <CalendarDays className="h-4 w-4 text-teal-700" />
          <span>{today}</span>
        </div>
      </div>
    </header>
  );
}
