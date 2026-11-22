"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "@/app/components/navigation/NavigationFeedback";
import {
  Home,
  Users,
  Layers3,
  Tag,
  Menu,
  X,
  ShoppingBag,
  PlusCircle,
  Plus,
  Newspaper,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Trophy,
  Bell,
  CalendarClock,
  Truck,
  Gamepad2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import AddProductDrawer from "./drawers/AddProductDrawer";
import AddCategoryDrawer from "./drawers/AddCategoryDrawer";
import AddTagDrawer from "./drawers/AddTagDrawer";
import { toast } from "react-toastify";

type DrawerAction =
  | "addProduct"
  | "addGame"
  | "addImage"
  | "addCategory"
  | "addTag"
  | null;

interface NavItem {
  label: string;
  href?: string;
  icon: typeof Home;
  action?: DrawerAction;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "بازگشت به سایت", href: "/", icon: Home },
  { label: "داشبورد", href: "/dashboard", icon: Layers3 },
  { label: "اعلان‌ها", href: "/dashboard/notifications", icon: Bell },
  { label: "کاربران", href: "/dashboard/users", icon: Users },
  { label: "وبلاگ", href: "/dashboard/blogs", icon: Newspaper },
  { label: "باشگاه مشتریان", href: "/dashboard/loyalty", icon: Trophy },
  { label: "پیام‌های پیشنهادی سایت", href: "/dashboard/promotion-modals", icon: Sparkles },
  { label: "نوبت‌ها", href: "/dashboard/appointments", icon: CalendarClock },
  { label: "تنظیمات ارسال", href: "/dashboard/shipping", icon: Truck },
  {
    label: "محصولات",
    icon: ShoppingBag,
    children: [
      { label: "لیست محصولات", href: "/dashboard/products", icon: ShoppingBag },
      { label: "افزودن محصول", action: "addProduct", icon: PlusCircle },
      { label: "دسته‌بندی‌ها", action: "addCategory", icon: Tag },
      { label: "تگ‌ها", action: "addTag", icon: Sparkles },
    ],
  },
  {
    label: "سفارشات",
    icon: ClipboardList,
    children: [
      { label: "فروش‌های صندوق", href: "/dashboard/pos-sales", icon: ClipboardList },
      { label: "سفارشات محصول", href: "/dashboard/orders", icon: Layers3 },
      { label: "ثبت سفارش دستی", href: "/dashboard/store-order", icon: Plus },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visibleNavItems =
    role === "admin"
      ? [
          { label: "بازگشت به سایت", href: "/", icon: Home },
          { label: "اعلان‌ها", href: "/dashboard/notifications", icon: Bell },
          { label: "نوبت‌ها", href: "/dashboard/appointments", icon: CalendarClock },
          { label: "تنظیمات ارسال", href: "/dashboard/shipping", icon: Truck },
          {
            label: "سفارشات",
            icon: ClipboardList,
            children: [
              { label: "ثبت سفارش دستی", href: "/dashboard/store-order", icon: Plus },
            ],
          },
        ]
      : navItems;
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openMenus, setOpenMenus] = useState<string[]>(["محصولات", "سفارشات"]);
  const [activeDrawer, setActiveDrawer] = useState<DrawerAction>(null);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleAction = (action?: DrawerAction) => {
    if (action) setActiveDrawer(action);
  };

  const closeDrawer = () => setActiveDrawer(null);
 const handleLinkClick = () => setMobileOpen(false);
  useEffect(() => {
    const countMsg = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) throw new Error("خطا در دریافت اعلان‌ها");
        const data = await res.json();
        setUnreadCount(Number(data.unreadCount) || 0);
      } catch {
        toast.error("اعلان‌ها دریافت نشدند؛ دوباره تلاش کنید.");
      }
    };

    countMsg();
  }, []);
useEffect(() => {
    setMobileOpen(false);
   }, [pathname]);
  return (
    <>
      <button
        title="باز کردن منو"
        onClick={() => setMobileOpen(true)}
        className="fixed right-3 top-3 z-50 rounded-xl border border-lime-300/30 bg-[#101d30] p-2.5 text-lime-300 shadow-lg md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`dashboard-sidebar fixed right-0 top-0 z-50 flex h-full flex-col overflow-hidden transition-all duration-300 md:static
        ${expanded ? "md:w-72" : "md:w-20"}
        ${mobileOpen ? "w-72 translate-x-0" : "w-0 translate-x-full md:w-auto md:translate-x-0"}`}
      >
        <div className="flex min-h-[86px] items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
              <Gamepad2 className="h-6 w-6" />
            </span>
            {expanded && (
              <div className="min-w-0 text-right">
                <p className="truncate text-[11px] font-medium tracking-wide text-slate-400">مدیریت فروشگاه</p>
                <h2 className="truncate text-base font-black text-white">Kerman <span className="text-lime-300">Atari</span></h2>
              </div>
            )}
          </div>
          <button type="button" title={expanded ? "جمع کردن منو" : "باز کردن منو"} aria-label={expanded ? "جمع کردن منو" : "باز کردن منو"}
            onClick={() => setExpanded(prev => !prev)} className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-lime-300 md:inline-flex">
            {expanded ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </button>
          <button type="button" title="بستن منو" aria-label="بستن منو" onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="منوی مدیریت" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5 text-sm">
          {visibleNavItems.map((item) => {
            const isOpen = openMenus.includes(item.label);
            const directActive = item.href && pathname === item.href;
            const childActive = item.children?.some((child) => child.href && pathname === child.href);

            if (item.children) {
              return (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition ${
                      childActive ? "bg-lime-300/10 text-lime-300" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {expanded && item.label}
                    </span>

                    {expanded && (
                      <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-1 space-y-1 border-r border-lime-300/15 pr-2">
                      {item.children.map((sub) => {
                        const isActive = sub.href ? pathname === sub.href : false;

                        if (sub.action) {
                          return (
                            <button
                              key={sub.label}
                              onClick={() => handleAction(sub.action)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-slate-300 transition hover:bg-white/[0.07] hover:text-lime-200"
                            >
                              <sub.icon className="h-4 w-4" />
                              {expanded && sub.label}
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={sub.label}
                            href={sub.href!}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                              isActive
                                ? "bg-lime-300 text-slate-950 font-bold shadow-[0_3px_12px_rgba(163,230,53,0.12)]"
                                : "text-slate-300 hover:bg-white/[0.07] hover:text-lime-200"
                            }`}
                          >
                            <sub.icon className="h-4 w-4" />
                            {expanded && sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                  onClick={handleLinkClick}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  directActive
                    ? "bg-lime-300 text-slate-950 font-bold shadow-[0_3px_12px_rgba(163,230,53,0.12)]"
                    : "text-slate-300 hover:bg-white/[0.07] hover:text-lime-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {expanded && item.label}

                {item.label === "اعلان‌ها" && unreadCount > 0 && (
                  <span className="mr-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {role === "superadmin" && expanded && (
          <div className="border-t border-white/10 px-4 py-4">
            <button type="button" onClick={() => { setMobileOpen(false); setActiveDrawer("addProduct"); }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_5px_20px_rgba(163,230,53,0.12)] transition hover:bg-lime-200">
              <PlusCircle className="h-4 w-4" /> ثبت محصول جدید
            </button>
          </div>
        )}
      </aside>

      {activeDrawer === "addProduct" && <AddProductDrawer onClose={closeDrawer} />}
      {activeDrawer === "addCategory" && <AddCategoryDrawer onClose={closeDrawer} />}
      {activeDrawer === "addTag" && <AddTagDrawer onClose={closeDrawer} />}
    </>
  );
}
