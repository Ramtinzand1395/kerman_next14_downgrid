"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  User,
  UserCircle2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "@/app/components/navigation/NavigationFeedback";

import { useId } from "react";
import { headerActionStyle, headerControlFocus } from "./navigationItems";
import type { HeaderDropdownProps } from "./useHeaderDropdown";

export default function UserBtn({ open, boundaryEvents, onToggle, onClose }: HeaderDropdownProps) {
  const { data: session } = useSession();
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <>
      {session ? (
        <div
          className="relative"
          {...boundaryEvents}
        >
          <button
            title="منوی حساب کاربری" aria-label="منوی حساب کاربری"
            type="button"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={onToggle}
            className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 transition-colors hover:border-slate-300 md:gap-2 md:border-0 md:bg-transparent md:px-0 md:py-0 ${headerActionStyle} ${headerControlFocus}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <User className="h-4 w-4 text-slate-700" />
            </div>

            <span className="hidden xl:inline">حساب کاربری</span>
            <ChevronDown aria-hidden="true"
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${
                open ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                id={panelId}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:w-80 xl:top-full"
              >
                <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">ورود شده به حساب</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                    {session.user?.username || "کاربر"}
                  </p>
                </div>

                <div className="space-y-1">
                  {session.user && session.user.role === "user" ? (
                    <>
                      <Link
                        onClick={onClose}
                        href="/my-profile?step=1"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                      >
                        <UserCircle2 className="h-4 w-4" /> پروفایل من
                      </Link>

                      <Link
                        onClick={onClose}
                        href="/my-profile?step=5"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                      >
                        <Package className="h-4 w-4" /> سفارش ها
                      </Link>

                      <Link
                        onClick={onClose}
                        href="/my-profile?step=2"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                      >
                        <Heart className="h-4 w-4" /> لیست علاقه مندی ها
                      </Link>
                    </>
                  ) : (
                    <Link
                      onClick={onClose}
                      href={
                        session.user?.role === "admin"
                          ? "/dashboard/store-order"
                          : "/dashboard"
                      }
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                    >
                      <LayoutDashboard className="h-4 w-4" /> داشبورد
                    </Link>
                  )}
                </div>

                <div className="my-2 h-px bg-slate-200" />

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" /> خروج از حساب
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Link
          href="/auth/login"
          aria-label="ورود به حساب کاربری"
          className={`rounded-lg border border-slate-200 bg-white p-1.5 md:border-0 md:bg-transparent md:p-0 xl:flex xl:items-center xl:gap-2 ${headerActionStyle} ${headerControlFocus}`}
        >
          <User aria-hidden="true" className="h-5 w-5 text-black transition hover:text-[#427D9D] xl:text-current" />
          <span className="hidden xl:inline">ورود به حساب</span>
        </Link>
      )}
    </>
  );
}
