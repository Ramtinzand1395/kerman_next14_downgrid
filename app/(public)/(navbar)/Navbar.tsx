"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Home,
  Info,
  Phone,
  Grid2x2,
  ChevronDown,
  FileText,
  Menu,
  Sparkles,
  ArrowUpLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useMemo, useState } from "react";
import MobileMenu from "./MobileMenu";
import { usePathname, useRouter } from "next/navigation";
import CartDropdown from "./CartDropdown";
import UserBtn from "./UserBtn";
import { categories } from "../constants/categories";
import { useSession } from "next-auth/react";

const menuItems = [
  { name: "خانه", link: "/", icon: <Home className="h-4 w-4 ml-1" /> },
  {
    name: "دسته‌بندی‌ها",
    link: "#",
    icon: <Grid2x2 className="h-4 w-4 ml-1" />,
  },
  {
    name: "درباره ما",
    link: "/about-us",
    icon: <Info className="h-4 w-4 ml-1" />,
  },
  {
    name: "تماس با ما",
    link: "/contact-us",
    icon: <Phone className="h-4 w-4 ml-1" />,
  },
  {
    name: "وبلاگ",
    link: "/blog",
    icon: <FileText className="h-4 w-4 ml-1" />,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [showCategories, setShowCategories] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<"user" | "cart" | null>(
    null
  );

  const quickLinks = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.subcategories.map((sub) => ({
          ...sub,
          parentName: cat.name,
        }))
      ),
    []
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) {
      router.push("/products?sort=newest&page=1");
      return;
    }

    const params = new URLSearchParams();
    params.set("q", query);
    params.set("page", "1");
    params.set("sort", "newest");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-md sm:px-3 md:px-10"
        role="navigation"
        aria-label="منوی اصلی سایت کرمان آتاری"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          aria-label="صفحه اصلی کرمان آتاری"
        >
          <Image
            width={30}
            height={30}
            alt="لوگوی کرمان آتاری"
            src="/atari-seeklogo.svg"
            className="h-8 w-8"
            priority
          />
          <h1 className="hidden truncate text-base font-extrabold tracking-tight text-slate-900 sm:block md:text-lg">
            Kerman Atari
          </h1>
        </Link>

        <ul className="relative hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-gray-700 shadow-sm md:flex">
          {menuItems.map((item) => (
            <li
              key={item.name}
              onMouseEnter={() =>
                item.name === "دسته‌بندی‌ها" && setShowCategories(true)
              }
              onMouseLeave={() =>
                item.name === "دسته‌بندی‌ها" && setShowCategories(false)
              }
              className="relative"
            >
              <Link
                href={item.link}
                aria-label={`رفتن به ${item.name}`}
                className={`group relative flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  pathname === item.link
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-slate-100 hover:text-blue-600"
                }`}
              >
                {item.icon}
                {item.name}
                {item.name === "دسته‌بندی‌ها" && (
                  <ChevronDown className="ml-1 h-4 w-4" />
                )}
                <span className="absolute -bottom-0 left-3 h-0.5 w-0 bg-[#427D9D] transition-all duration-300 group-hover:w-[calc(100%-24px)]" />
              </Link>

              <AnimatePresence>
                {item.name === "دسته‌بندی‌ها" && showCategories && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-12 z-50 w-[520px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        دسته‌بندی‌های محبوب
                      </div>

                      <Link
                        href="/products?sort=newest&page=1"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        aria-label="مشاهده همه محصولات"
                      >
                        مشاهده همه
                        <ArrowUpLeft className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.name}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                        >
                          <div className="mb-2 text-sm font-bold text-slate-800">
                            {cat.name}
                          </div>
                          <div className="flex flex-col gap-1">
                            {cat.subcategories.slice(0, 5).map((sub) => (
                              <Link
                                key={sub.name}
                                href={sub.slug}
                                className="rounded-lg px-2 py-1 text-xs text-slate-700 transition hover:bg-white hover:text-blue-600"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>

        <form
          onSubmit={handleSearch}
          className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-inner lg:flex lg:w-[22vw]"
          role="search"
          aria-label="جستجو در محصولات"
        >
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1 bg-transparent p-1 text-sm text-black outline-none"
            placeholder="جستجو در محصولات..."
            type="search"
            name="q"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
            aria-label="اجرای جستجو"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="relative flex shrink-0 items-center gap-1.5 md:gap-4">
          <UserBtn
            setActiveDropdown={setActiveDropdown}
            activeDropdown={activeDropdown}
          />

          <CartDropdown
            setActiveDropdown={setActiveDropdown}
            activeDropdown={activeDropdown}
          />

          <button
            className="rounded-xl border border-slate-200 bg-white p-2 text-black shadow-sm md:hidden"
            aria-label="باز کردن منو"
            onClick={() => setMobileMenuOpen(true)}
            title="Open_Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileMenuOpen && (
          <MobileMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            menuItems={menuItems}
            categories={categories}
            quickLinks={quickLinks}
            user={
              session?.user
                ? { name: session.user.username, role: session.user.role }
                : null
            }
          />
        )}
      </nav>
    </>
  );
}
