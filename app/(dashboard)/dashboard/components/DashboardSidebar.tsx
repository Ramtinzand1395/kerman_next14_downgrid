"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import AddProductDrawer from "./drawers/AddProductDrawer";
import AddCategoryDrawer from "./drawers/AddCategoryDrawer";
import AddTagDrawer from "./drawers/AddTagDrawer";

type DrawerAction =
  | "addProduct"
  | "addGame"
  | "addImage"
  | "addCategory"
  | "addTag"
  | null;
// --- Navigation Items ---
export const navItems: NavItem[] = [
  { label: "صفحه اصلی ", href: "/", icon: Home },

  { label: "داشبورد", href: "/dashboard", icon: Layers3 },
  { label: "پیام‌ها", href: "/dashboard/inbox", icon: Inbox },
  { label: "کاربران", href: "/dashboard/users", icon: Users },

  {
    label: "مدیریت محصولات",
    icon: Plus,
    children: [
      { label: "لیست محصولات", href: "/dashboard/products", icon: ShoppingBag },
      { label: "افزودن محصول جدید", action: "addProduct", icon: PlusCircle },
      { label: "دسته‌بندی‌ها", action: "addCategory", icon: Tag },
      { label: "تگ ها", action: "addTag", icon: Tag },
    ],
  },

  {
    label: "سفارشات",
    icon: Plus,
    href: "/dashboard/orders",
    children: [
      {
        label: "ثبت سفارش",
        href: "/dashboard/store-order",
        icon: PlusCircle,
      },
      {
        label: "سفارشات محصولات",
        href: "/dashboard/orders",
        icon: Layers3,
      },
    ],
  },
];
interface NavItem {
  label: string;
  href?: string;
  icon: typeof Home; // Lucide icon type
  action?: DrawerAction;
  children?: NavItem[];
}

// --- Sidebar Component ---
export default function DashboardSidebar() {
  const pathname = usePathname();

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // کشویی بودن منوها
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const [activeDrawer, setActiveDrawer] = useState<
    null | "addProduct" | "addGame" | "addImage" | "addCategory" | "addTag"
  >(null);

  const handleAction = (action?: DrawerAction) => {
    if (action) setActiveDrawer(action);
  };

  const closeDrawer = () => setActiveDrawer(null);

  return (
    <>
      {/* Mobile Button */}
      <button
        title="MobileOpen"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 bg-indigo-600  text-white p-2 rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 right-0 h-full bg-indigo-600  text-white shadow-lg flex flex-col z-50
        transition-all duration-300
        ${expanded ? "md:w-64" : "md:w-16"}
        ${
          mobileOpen
            ? "w-64 translate-x-0"
            : "w-0 md:w-auto md:translate-x-0 translate-x-full"
        }
        overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              title="Expanded"
              onClick={() => setExpanded(!expanded)}
              className="text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {expanded && (
              <span className="font-semibold text-sm">پنل مدیریت</span>
            )}
          </div>

          <button
            title="MobileOpen"
            onClick={() => setMobileOpen(false)}
            className="md:hidden"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 text-sm">
          {navItems.map((item, index) => {
            const isOpen = openMenus.includes(item.label);

            return (
              <div key={index} className="mb-2">
                {/* اگر آیتم children دارد */}
                {item.children ? (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="flex items-center justify-between w-full p-2 rounded-lg cursor-pointer hover:bg-[#377dff] transition"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {expanded && <span>{item.label}</span>}
                    </div>
                  </button>
                ) : (
                  <Link
                    href={item.href!}
                    className={`flex items-center gap-3 p-2 rounded-lg transition
               ${
                 pathname === item.href
                   ? "bg-[#0057f9] text-white"
                   : "hover:bg-[#377dff]"
               }
                       `}
                  >
                    <item.icon className="w-4 h-4" />
                    {expanded && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Submenu */}
                {item.children && isOpen && (
                  <div
                    className={`mt-1 border-r border-white/10 cursor-pointer ${
                      expanded ? "mr-3" : "mr-0"
                    }`}
                  >
                    {item.children.map((sub, i) => {
                      const isActive = pathname === sub.href;

                      // اگر آیتم action داشته باشد → دکمه باشد
                      if (sub.action) {
                        return (
                          <button
                            key={i}
                            onClick={() => handleAction(sub.action)}
                            className="flex items-center gap-3 p-2 rounded-md text-gray-300 hover:text-white hover:bg-[#377dff] w-full text-right"
                          >
                            <sub.icon className="w-4 h-4" />
                            {expanded && <span>{sub.label}</span>}
                          </button>
                        );
                      }

                      // اگر href دارد → لینک باشد
                      return (
                        <Link
                          key={i}
                          href={sub.href!}
                          className={`flex items-center gap-3 p-2 rounded-md transition w-full
            ${
              isActive
                ? "bg-[#0057f9] text-white"
                : "text-gray-300 hover:text-white hover:bg-[#377dff]"
            }
          `}
                        >
                          <sub.icon className="w-4 h-4" />
                          {expanded && <span>{sub.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      {/* دراورها */}
      {activeDrawer === "addProduct" && (
        <AddProductDrawer onClose={closeDrawer} />
      )}
      {activeDrawer === "addCategory" && (
        <AddCategoryDrawer onClose={closeDrawer} />
      )}
      {activeDrawer === "addTag" && <AddTagDrawer onClose={closeDrawer} />}
    </>
  );
}
