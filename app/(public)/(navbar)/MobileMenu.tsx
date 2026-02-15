"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, User, Sparkles, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  name: string;
  slug: string;
  description: string;
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
  quickLinks: { name: string; slug: string; parentName: string }[];
  user?: UserWithRole | null;
}

export default function MobileMenu({
  isOpen,
  onClose,
  menuItems,
  categories,
  quickLinks,
  user,
}: MobileMenuProps) {
  const router = useRouter();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openUserMenu, setOpenUserMenu] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set("sort", "newest");
    params.set("page", "1");

    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    }

    router.push(`/products?${params.toString()}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-50 h-full w-[86%] overflow-y-auto border-l border-slate-200 bg-white shadow-xl sm:w-1/2"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
          >
            <div className="sticky top-0 border-b border-gray-200 bg-white/95 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#001A6E]">منوی سایت</h2>
                <button
                  onClick={onClose}
                  aria-label="بستن منو"
                  className="rounded-lg border border-slate-200 p-1"
                >
                  <X className="h-6 w-6 text-gray-700" />
                </button>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2 py-1"
              >
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full bg-transparent py-1 text-sm text-gray-800 outline-none"
                  placeholder="جستجو در محصولات..."
                  aria-label="جستجو در محصولات"
                />
                <button
                  type="submit"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="space-y-3 p-4">
              {quickLinks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-bold text-slate-500">دسترسی سریع</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickLinks.slice(0, 6).map((link) => (
                      <Link
                        key={link.slug}
                        href={`/products?sort=newest&category=${link.slug}&page=1`}
                        onClick={onClose}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {menuItems.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2"
                >
                  {item.name === "دسته‌بندی‌ها" ? (
                    <>
                      <button
                        onClick={() =>
                          setOpenCategory(openCategory === item.name ? null : item.name)
                        }
                        className="flex w-full items-center justify-between text-base font-semibold text-gray-800 transition hover:text-blue-600"
                        aria-expanded={openCategory === item.name}
                      >
                        <span className="flex items-center gap-2">
                          {item.icon}
                          {item.name}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
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
                            className="mt-2 space-y-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3"
                          >
                            {categories.map((cat) => (
                              <li key={cat.slug} className="space-y-1">
                                <Link
                                  href={`/products?sort=newest&category=${cat.slug}&page=1`}
                                  onClick={onClose}
                                  className="flex items-center gap-1 font-bold text-[#001A6E]"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  {cat.name}
                                </Link>

                                <p className="text-xs text-slate-500">{cat.description}</p>

                                <ul className="space-y-1 pr-2">
                                  {cat.subcategories.map((sub) => (
                                    <li key={sub.slug}>
                                      <Link
                                        aria-label={`رفتن به ${sub.name}`}
                                        href={`/products?sort=newest&category=${sub.slug}&page=1`}
                                        onClick={onClose}
                                        className="block text-sm text-gray-600 transition hover:text-blue-600"
                                      >
                                        {sub.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={item.link}
                      onClick={onClose}
                      className="flex items-center gap-2 py-1 text-base font-semibold text-gray-800 transition hover:text-blue-600"
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}

              {user && (
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3">
                  <button
                    onClick={() => setOpenUserMenu(!openUserMenu)}
                    className="flex w-full items-center justify-between text-base font-medium text-gray-800 transition hover:text-blue-600"
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" /> {user.name || "کاربر"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
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
                        className="mt-2 space-y-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <li>
                          <Link
                            href="/my-profile?step=1"
                            onClick={onClose}
                            className="block text-sm text-gray-600 transition hover:text-blue-600"
                          >
                            پروفایل من
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/my-profile?step=5"
                            onClick={onClose}
                            className="block text-sm text-gray-600 transition hover:text-blue-600"
                          >
                            سفارش‌ها
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/my-profile?step=2"
                            onClick={onClose}
                            className="block text-sm text-gray-600 transition hover:text-blue-600"
                          >
                            لیست علاقه‌مندی‌ها
                          </Link>
                        </li>

                        <li>
                          <button
                            onClick={() => {
                              signOut({ callbackUrl: "/" });
                              onClose();
                            }}
                            className="w-full text-left text-sm text-red-600 hover:text-red-700"
                          >
                            خروج
                          </button>
                        </li>
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
