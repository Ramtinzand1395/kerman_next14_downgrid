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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import MobileMenu from "./MobileMenu";
import { usePathname } from "next/navigation";
import CartDropdown from "./CartDropdown";
import UserBtn from "./UserBtn";

const categories = [
  {
    name: "کنسول‌ها",
    slug: "consoles",
    subcategories: [
      { name: "پلی‌استیشن 5", slug: "playstation-5" },
      { name: "پلی‌استیشن 4", slug: "playstation-4" },
      { name: "پلی‌استیشن 3", slug: "playstation-3" },
    ],
  },
  {
    name: "بازی‌ها",
    slug: "games",
    subcategories: [
      { name: "بازی اکانتی", slug: "account-games" },
      { name: "بازی دیسکی", slug: "disc-games" },
      { name: "گیفت کارت", slug: "gift-cards" },
    ],
  },
  {
    name: "لوازم جانبی",
    slug: "accessories",
    subcategories: [
      { name: "دسته بازی", slug: "controllers" },
      { name: "هدست و هدفون", slug: "headsets" },
      { name: "پایه و خنک‌کننده", slug: "stands-coolers" },
    ],
  },
  {
    name: "خدمات",
    slug: "services",
    subcategories: [
      { name: "نصب بازی", slug: "game-installation" },
      { name: "اکانت قانونی", slug: "legal-accounts" },
      { name: "تعمیرات کنسول", slug: "console-repair" },
    ],
  },
  {
    name: "لوازم گیمینگ",
    slug: "gaming",
    subcategories: [
      { name: "موس", slug: "mouse" },
      { name: "کیبرد", slug: "keyboard" },
      { name: "پاوربانک", slug: "powerbank" },
    ],
  },
];

const menuItems = [
  { name: "خانه", link: "/", icon: <Home className="w-4 h-4 ml-1" /> },
  {
    name: "دسته‌بندی‌ها",
    link: "#",
    icon: <Grid2x2 className="w-4 h-4 ml-1" />,
  },
  {
    name: "درباره ما",
    link: "/about-us",
    icon: <Info className="w-4 h-4 ml-1" />,
  },
  {
    name: "تماس با ما",
    link: "/contact-us",
    icon: <Phone className="w-4 h-4 ml-1" />,
  },
  {
    name: "وبلاگ",
    link: "/weblog",
    icon: <FileText className="w-4 h-4 ml-1" />,
  },
];

export default function Navbar() {
  const pathname = usePathname();

  const [showCategories, setShowCategories] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"user" | "cart" | null>(
    null
  );

  return (
    <>
      <nav
        className="flex items-center justify-between bg-white p-2 md:px-10 shadow-lg sticky top-0 z-50"
        role="navigation"
        aria-label="منوی اصلی سایت کرمان آتاری"
      >
        {/* لوگو */}
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="صفحه اصلی کرمان آتاری"
        >
          <Image
            width={30}
            height={30}
            alt="لوگوی کرمان آتاری"
            src="/atari-seeklogo.svg"
            className="w-8 h-8"
            priority
          />
          <h1 className="text-black font-bold md:text-lg text-base">
            Kerman Atari
          </h1>
        </Link>

        {/* منوی اصلی */}
        <ul className="hidden md:flex text-gray-700 items-center gap-6 relative">
          {menuItems.map((item, i) => (
            <li
              key={i}
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
                className={`group flex items-center gap-1 text-sm transition relative
               ${
                 pathname === item.link ? "text-blue-600" : "text-gray-700"
               } hover:text-blue-600 `}
              >
                {item.icon}
                {item.name}
                {item.name === "دسته‌بندی‌ها" && (
                  <ChevronDown className="w-5 h-5 ml-1" />
                )}
                <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-[#427D9D] transition-all duration-300 group-hover:w-full"></span>
              </Link>

              {item.name === "دسته‌بندی‌ها" && (
                <AnimatePresence>
                  {showCategories && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 15 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="fixed left-0 w-screen bg-gray-100/95 shadow-xl rounded-b-xl p-5 text-black flex items-center justify-around z-50"
                      onMouseEnter={() => setShowCategories(true)}
                      onMouseLeave={() => setShowCategories(false)}
                    >
                      {categories.map((cat) => (
                        <div key={cat.name}>
                          <h3 className="font-bold text-[#001A6E] mb-2">
                            {cat.name}
                          </h3>
                          <ul className="space-y-1">
                            {cat.subcategories.map((sub) => (
                              <li key={sub.slug}>
                                <Link
                                  href={`/products/${cat.slug}/${sub.slug}`}
                                  className="text-sm hover:text-blue-600 transition"
                                  aria-label={`رفتن به ${cat.slug}`}
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </li>
          ))}
        </ul>

        {/* نوار جستجو */}
        <div className="items-center lg:w-[20vw] hidden lg:flex bg-white rounded-md px-2 shadow-inner">
          <input
            className="bg-transparent flex-1 p-1 text-black outline-none text-sm"
            placeholder="جستجو در محصولات..."
            type="search"
            aria-label="جستجو در محصولات"
          />
          <Search className="text-black w-4 h-4" />
        </div>

        {/* کاربر و سبد خرید */}
        <div className="flex items-center gap-1 md:gap-4 relative">
          <UserBtn
            setActiveDropdown={setActiveDropdown}
            activeDropdown={activeDropdown}
          />

          {/* سبد خرید */}
          <CartDropdown
            setActiveDropdown={setActiveDropdown}
            activeDropdown={activeDropdown}
          />
          {/* منوی موبایل */}
          <button
            className="md:hidden text-black"
            onClick={() => setMobileMenuOpen(true)}
            title="Open_Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        {mobileMenuOpen && (
          <MobileMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            menuItems={menuItems}
            categories={categories}
          />
        )}
      </nav>
    </>
  );
}
