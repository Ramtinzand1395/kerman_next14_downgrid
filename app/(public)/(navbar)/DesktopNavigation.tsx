"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpLeft, ChevronDown, Gamepad2, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId } from "react";
import Link from "@/app/components/navigation/NavigationFeedback";
import { categories, categoryMenuHref } from "../constants/categories";
import { headerControlFocus, navigationItems } from "./navigationItems";
import { useHeaderDropdown } from "./useHeaderDropdown";

const consoleGenerations = [
  { name: "PS2", slug: "playstation-2" },
  { name: "PS3", slug: "playstation-3" },
  { name: "PS4", slug: "playstation-4" },
  { name: "PS5", slug: "playstation-5" },
];

function matchesSection(pathname: string, section: string) {
  return pathname === section || (section !== "/" && pathname.startsWith(`${section}/`));
}

function CategoryNavigation({
  current,
  item,
}: {
  current: "page" | "location" | undefined;
  item: (typeof navigationItems)[number];
}) {
  const { root, active, boundary, close, toggle } = useHeaderDropdown<"categories", HTMLLIElement>();
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  const open = active === "categories";

  return (
    <li
      ref={root}
      {...boundary("categories")}
      className={`relative flex items-stretch border-b-2 ${
        current ? "border-blue-600 bg-blue-50 text-blue-600" : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-blue-600"
      }`}
    >
      <Link
        href={item.link}
        aria-current={current}
        onClick={close}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg ps-3 pe-1 text-sm font-semibold ${headerControlFocus}`}
      >
        {item.icon}
        {item.name}
      </Link>
      <button
        type="button"
        aria-label="نمایش منوی دسته‌بندی‌ها"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => toggle("categories")}
        className={`grid w-9 shrink-0 place-items-center rounded-lg ${headerControlFocus}`}
      >
        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="absolute start-0 top-full z-50 max-h-[70dvh] w-[720px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl"
            onClick={event => {
              if (event.target instanceof Element && event.target.closest("a")) close();
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-blue-600" />
                دسته‌بندی‌ها
              </div>
              <Link href="/products" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                مشاهده همه محصولات
                <ArrowUpLeft aria-hidden="true" className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {categories.map(category => (
                <div key={category.slug} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <Link href={categoryMenuHref(category.slug)} className="mb-2 block text-sm font-bold text-slate-800">
                    {category.name}
                  </Link>
                  <div className="flex flex-col gap-1">
                    {category.subcategories.slice(0, 5).map(subcategory => (
                      <Link
                        key={subcategory.name}
                        href={categoryMenuHref(subcategory.slug)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-700 transition hover:bg-white hover:text-blue-600"
                      >
                        {subcategory.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-blue-200 bg-[linear-gradient(140deg,#eef5ff_0%,#fff_100%)] p-3">
                <Link href="/used-consoles" className="mb-2 flex items-center gap-2 text-sm font-black text-blue-800 transition hover:text-blue-600">
                  <Gamepad2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                  کنسول‌های کارکرده
                </Link>
                <p className="mb-2 text-xs leading-5 text-slate-600">
                  پلی‌استیشن PS2 تا PS5 با تصاویر و گزارش تست هر دستگاه
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {consoleGenerations.map(({ name, slug }) => (
                    <Link
                      key={slug}
                      href={`/used-consoles?generation=${slug}`}
                      className="rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function DesktopNavigation() {
  const pathname = usePathname() ?? "/";
  const catalogSections = ["/category", "/product", "/products", "/used-consoles"];

  return (
    <nav aria-label="منوی اصلی سایت کرمان آتاری" className="hidden border-t border-slate-100 xl:block">
      <ul className="mx-auto flex max-w-[1440px] items-stretch justify-center gap-2 px-10">
        {navigationItems.map(({ name, link, icon }) => {
          const catalog = link === "/categories";
          const current = pathname === link
            ? "page"
            : matchesSection(pathname, link) || (catalog && catalogSections.some(section => matchesSection(pathname, section)))
              ? "location"
              : undefined;

          return catalog ? (
            <CategoryNavigation key={link} current={current} item={{ name, link, icon }} />
          ) : (
            <li key={link} className="flex">
              <Link
                href={link}
                aria-current={current}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-3 text-sm font-semibold transition-colors motion-reduce:transition-none ${headerControlFocus} ${
                  current
                    ? "border-blue-600 bg-blue-50 text-blue-600"
                    : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                }`}
              >
                {icon}
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
