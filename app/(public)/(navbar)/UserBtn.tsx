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

export default function UserBtn({
  setActiveDropdown,
  activeDropdown,
}: UserBtnProps) {
  const { data: session } = useSession();

  return (
    <>
      {session ? (
        <div
          className="relative"
          onMouseEnter={() => setActiveDropdown("user")}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className=" items-center gap-2 cursor-pointer hidden md:flex">
            <span className=" text-sm text-black">
              {session.user?.username}
            </span>
            <ChevronDown className="text-black w-4 h-4" />
          </div>

          <AnimatePresence>
            {activeDropdown === "user" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute left-0 top-10 w-48 bg-white shadow-lg rounded-xl border border-gray-200 p-3 z-50"
              >
                {session.user && session.user.role === "user" ? (
                  <>
                    <Link
                      href="/my-profile"
                      className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition text-sm py-2"
                    >
                      <User className="w-4 h-4" /> پروفایل من
                    </Link>
                    <Link
                      href="/my-profile"
                      className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition text-sm py-2"
                    >
                      <User className="w-4 h-4" /> سفارش ها
                    </Link>
                    <Link
                      href="/my-profile?step=2"
                      className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition text-sm py-2"
                    >
                      <User className="w-4 h-4" /> لیست علاقه مندی ها
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition text-sm py-2"
                  >
                    <User className="w-4 h-4" /> داشبورد
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left flex items-center gap-2 text-red-600 hover:text-red-700 transition text-sm py-2 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
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
        <Link href="/auth/login" aria-label="ورود به حساب کاربری">
          <User className="text-black w-5 h-5 hover:text-[#427D9D] transition" />
        </Link>
      )}
    </>
  );
}
