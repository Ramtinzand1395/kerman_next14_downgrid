"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId } from "react";
import Link from "@/app/components/navigation/NavigationFeedback";
import CategoryBrowser from "./CategoryBrowser";
import { headerControlFocus, navigationItems } from "./navigationItems";
import { useHeaderDropdown } from "./useHeaderDropdown";

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="absolute start-0 top-full z-50 h-[min(25rem,70dvh)] w-[46rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <CategoryBrowser desktop onLinkClick={close} />
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
      <ul className="mx-auto flex max-w-[1440px] items-stretch justify-start gap-2 px-10">
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
