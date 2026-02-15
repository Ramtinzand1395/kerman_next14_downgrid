"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

type DropdownType = "user" | "cart" | null;
interface UserBtnProps {
  setActiveDropdown: React.Dispatch<React.SetStateAction<DropdownType>>;
  activeDropdown: DropdownType;
}

export default function UserBtn({ setActiveDropdown, activeDropdown }: UserBtnProps) {
  const { data: session } = useSession();

  return (
    <>
      {session ? (
        <div
          className="relative"
          onMouseEnter={() => setActiveDropdown("user")}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:gap-2 md:border-0 md:px-0 md:py-0">
            <User className="h-4 w-4 text-black md:hidden" />
            <span className="hidden text-sm text-black md:inline">
              {session.user?.username}
            </span>
            <ChevronDown className="hidden h-3 w-3 text-black md:block" />
          </div>

          <AnimatePresence>
            {activeDropdown === "user" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute left-0 top-10 z-50 hidden w-48 rounded-xl border border-gray-200 bg-white p-3 shadow-lg md:block"
              >
                {session.user && session.user.role === "user" ? (
                  <>
                    <Link
                      href="/my-profile"
                      className="flex items-center gap-2 py-2 text-sm text-gray-800 transition hover:text-blue-600"
                    >
                      <User className="h-4 w-4" /> پروفایل من
                    </Link>
                    <Link
                      href="/my-profile"
                      className="flex items-center gap-2 py-2 text-sm text-gray-800 transition hover:text-blue-600"
                    >
                      <User className="h-4 w-4" /> سفارش ها
                    </Link>
                    <Link
                      href="/my-profile?step=2"
                      className="flex items-center gap-2 py-2 text-sm text-gray-800 transition hover:text-blue-600"
                    >
                      <User className="h-4 w-4" /> لیست علاقه مندی ها
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 py-2 text-sm text-gray-800 transition hover:text-blue-600"
                  >
                    <User className="h-4 w-4" /> داشبورد
                  </Link>
                )}

                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full cursor-pointer items-center gap-2 py-2 text-left text-sm text-red-600 transition hover:text-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                    />
                  </svg>
                  خروج از حساب
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Link
          href="/auth/login"
          aria-label="ورود به حساب کاربری"
          className="rounded-lg border border-slate-200 bg-white p-1.5 md:border-0 md:bg-transparent md:p-0"
        >
          <User className="h-5 w-5 text-black transition hover:text-[#427D9D]" />
        </Link>
      )}
    </>
  );
}
