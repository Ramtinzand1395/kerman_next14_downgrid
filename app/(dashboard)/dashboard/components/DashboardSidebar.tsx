"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Home,
  Inbox,
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

export const navItems: NavItem[] = [
  { label: "بازگشت به سایت", href: "/", icon: Home },
  { label: "داشبورد", href: "/dashboard", icon: Layers3 },
  { label: "پیام‌ها", href: "/dashboard/inbox", icon: Inbox },
  { label: "کاربران", href: "/dashboard/users", icon: Users },
  { label: "وبلاگ", href: "/dashboard/blogs", icon: Newspaper },
  { label: "باشگاه مشتریان", href: "/dashboard/loyalty", icon: Trophy },
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
        const res = await fetch("/api/admin/notifications/unread");
        if (!res.ok) throw new Error("خطا در دریافت پیام‌ها");
        const data = await res.json();
        setUnreadCount(Number(data) || 0);
      } catch {
        toast.error("خطا در دریافت پیام‌ها");
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
        className="fixed right-4 top-4 z-50 rounded-xl bg-blue-600 p-2 text-white shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`dashboard-sidebar fixed right-0 top-0 z-50 flex h-full flex-col overflow-hidden transition-all duration-300 md:static
        ${expanded ? "md:w-72" : "md:w-20"}
        ${mobileOpen ? "w-72 translate-x-0" : "w-0 translate-x-full md:w-auto md:translate-x-0"}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button title="تغییر حالت منو" onClick={() => setExpanded((prev) => !prev)}>
            <Menu className="h-5 w-5 text-white" />
          </button>

          {expanded && (
            <div className="text-right">
              <p className="text-xs text-indigo-100/80">مدیریت فروشگاه</p>
              <h2 className="font-bold text-white">Kerman Atari</h2>
            </div>
          )}

          <button title="بستن" onClick={() => setMobileOpen(false)} className="md:hidden">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4 text-sm">
          {visibleNavItems.map((item) => {
            const isOpen = openMenus.includes(item.label);
            const directActive = item.href && pathname === item.href;
            const childActive = item.children?.some((child) => child.href && pathname === child.href);

            if (item.children) {
              return (
                <div key={item.label} className="rounded-xl bg-white/5 p-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition ${
                      childActive ? "bg-white/20 text-white" : "hover:bg-white/10 text-indigo-50"
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
                    <div className="mt-1 space-y-1 border-r border-white/10 pr-2">
                      {item.children.map((sub) => {
                        const isActive = sub.href ? pathname === sub.href : false;

                        if (sub.action) {
                          return (
                            <button
                              key={sub.label}
                              onClick={() => handleAction(sub.action)}
                              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-right text-indigo-100 transition hover:bg-white/10 hover:text-white"
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
                            className={`flex items-center gap-3 rounded-md px-3 py-2 transition ${
                              isActive
                                ? "bg-indigo-500 text-white"
                                : "text-indigo-100 hover:bg-white/10 hover:text-white"
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
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  directActive
                    ? "bg-indigo-500 text-white shadow"
                    : "text-indigo-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {expanded && item.label}

                {item.label === "پیام‌ها" && unreadCount > 0 && (
                  <span className="mr-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {activeDrawer === "addProduct" && <AddProductDrawer onClose={closeDrawer} />}
      {activeDrawer === "addCategory" && <AddCategoryDrawer onClose={closeDrawer} />}
      {activeDrawer === "addTag" && <AddTagDrawer onClose={closeDrawer} />}
    </>
  );
}
