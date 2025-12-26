"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface Category {
  name: string;
  slug: string;
  subcategories: { name: string; slug: string }[];
}
interface MenuItem {
  name: string;
  link: string;
  icon: React.ReactNode;
}
interface UserWithRole {
  name?: string | null;
  role?: string;
}
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  categories: Category[];
  user?: UserWithRole | null;
}

export default function MobileMenu({
  isOpen,
  onClose,
  menuItems,
  categories,
  user,
}: MobileMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openUserMenu, setOpenUserMenu] = useState<boolean>(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* بک‌دراپ تار */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* منوی اسلایدی */}
          <motion.div
            className="fixed top-0 right-0 w-3/4 sm:w-1/2 h-full bg-white shadow-xl z-50 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
          >
            {/* هدر */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-[#001A6E]">منوی سایت</h2>
              <button onClick={onClose} aria-label="بستن منو">
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* آیتم‌ها */}
            <div className="p-4 space-y-4">
              {menuItems.map((item) => (
                <div key={item.name}>
                  {/* دسته‌بندی‌ها با کشویی */}
                  {item.name === "دسته‌بندی‌ها" ? (
                    <>
                      <button
                        onClick={() =>
                          setOpenCategory(
                            openCategory === item.name ? null : item.name
                          )
                        }
                        className="flex justify-between w-full items-center text-gray-800 text-base font-medium hover:text-blue-600 transition"
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          {item.name}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            openCategory === item.name ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {openCategory === item.name && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-5 mt-2 space-y-2 overflow-hidden"
                          >
                            {categories.map((cat) => (
                              <div key={cat.slug}>
                                <p className="text-[#001A6E] font-bold">
                                  {cat.name}
                                </p>
                                <ul className="pl-3 space-y-1">
                                  {cat.subcategories.map((sub) => (
                                    <li key={sub.slug}>
                                      <Link
                                        aria-label={`رفتن به ${cat.slug}`}
                                        href={`/products/${cat.slug}/${sub.slug}`}
                                        onClick={onClose}
                                        className="block text-gray-600 text-sm hover:text-blue-600 transition"
                                      >
                                        {sub.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={item.link}
                      onClick={onClose}
                      aria-label="بستن"
                      className="flex items-center gap-2 text-gray-800 text-base font-medium hover:text-blue-600 transition"
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}

              {/* منوی کاربر لاگین */}
              {user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <button
                    onClick={() => setOpenUserMenu(!openUserMenu)}
                    className="flex justify-between w-full items-center text-gray-800 text-base font-medium hover:text-blue-600 transition"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" /> {user.name || "کاربر"}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openUserMenu ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openUserMenu && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-5 mt-2 space-y-2 overflow-hidden"
                      >
                        <div>
                          <Link
                            href="/my-profile?step=1"
                            aria-label="پروفایل من"
                            onClick={onClose}
                            className="block text-gray-600 text-sm hover:text-blue-600 transition"
                          >
                            پروفایل من
                          </Link>
                        </div>
                        <div>
                          <Link
                            href="/my-profile?step=5"
                            aria-label="سفارش‌ها"
                            onClick={onClose}
                            className="block text-gray-600 text-sm hover:text-blue-600 transition"
                          >
                            سفارش‌ها
                          </Link>
                        </div>
                        <div>
                          <Link
                            aria-label=" لیست علاقه‌مندی‌ ها"
                            href="/my-profile?step=2"
                            onClick={onClose}
                            className="block text-gray-600 text-sm hover:text-blue-600 transition"
                          >
                            لیست علاقه‌مندی‌ها
                          </Link>
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              signOut({ callbackUrl: "/" });
                              onClose();
                            }}
                            className="w-full text-left text-red-600 hover:text-red-700 text-sm"
                          >
                            خروج
                          </button>
                        </div>
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
