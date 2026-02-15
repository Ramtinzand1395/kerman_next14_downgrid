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

  const [showCategories, setShowCategories] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<"user" | "cart" | null>(null);

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
        className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md md:px-10"
        role="navigation"
        aria-label="منوی اصلی سایت کرمان آتاری"
      >
        <Link href="/" className="flex items-center gap-2" aria-label="صفحه اصلی کرمان آتاری">
          <Image
            width={30}
            height={30}
            alt="لوگوی کرمان آتاری"
            src="/atari-seeklogo.svg"
            className="h-8 w-8"
            priority
          />
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">
            Kerman Atari
          </h1>
        </Link>

        <ul className="relative hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-gray-700 shadow-sm md:flex">
          {menuItems.map((item) => (
            <li
              key={item.name}
              onMouseEnter={() => item.name === "دسته‌بندی‌ها" && setShowCategories(true)}
              onMouseLeave={() => item.name === "دسته‌بندی‌ها" && setShowCategories(false)}
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
                {item.name === "دسته‌بندی‌ها" && <ChevronDown className="ml-1 h-4 w-4" />}
                <span className="absolute -bottom-0 left-3 h-0.5 w-0 bg-[#427D9D] transition-all duration-300 group-hover:w-[calc(100%-24px)]" />
              </Link>

              {item.name === "دسته‌بندی‌ها" && (
                <AnimatePresence>
                  {showCategories && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 15 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="fixed left-0 z-50 w-screen rounded-b-3xl border-b border-slate-200 bg-gradient-to-b from-white to-slate-100 p-8 text-black shadow-xl"
                      onMouseEnter={() => setShowCategories(true)}
                      onMouseLeave={() => setShowCategories(false)}
                    >
                      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 lg:grid-cols-5">
                        {categories.map((cat) => (
                          <section
                            key={cat.slug}
                            className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                            aria-label={`دسته ${cat.name}`}
                          >
                            <Link
                              href={`/products?sort=newest&category=${cat.slug}&page=1`}
                              className="mb-2 flex items-center justify-between font-bold text-[#001A6E] hover:text-blue-700"
                            >
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-4 w-4" />
                                {cat.name}
                              </span>
                              <ArrowUpLeft className="h-4 w-4" />
                            </Link>
                            <p className="mb-2 text-xs leading-6 text-slate-500">{cat.description}</p>
                            <ul className="space-y-1">
                              {cat.subcategories.map((sub) => (
                                <li key={sub.slug}>
                                  <Link
                                    href={`/products?sort=newest&category=${sub.slug}&page=1`}
                                    className="text-sm text-slate-700 transition hover:text-blue-600"
                                  >
                                    {sub.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
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

        <div className="relative flex items-center gap-2 md:gap-4">
          <UserBtn setActiveDropdown={setActiveDropdown} activeDropdown={activeDropdown} />

          <CartDropdown setActiveDropdown={setActiveDropdown} activeDropdown={activeDropdown} />

          <button
            className="rounded-xl border border-slate-200 bg-white p-2 text-black shadow-sm md:hidden"
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
          />
        )}
      </nav>
    </>
  );
}
