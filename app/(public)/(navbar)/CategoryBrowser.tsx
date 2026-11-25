"use client";

import { useId, useRef, useState, type KeyboardEvent, type MouseEventHandler } from "react";
import { ArrowUpLeft, ChevronLeft, Gamepad2, Grid2x2, Headphones, Wrench, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "@/app/components/navigation/NavigationFeedback";
import { categories, categoryMenuHref } from "../constants/categories";
import { headerControlFocus } from "./navigationItems";

const categoryIcons: Record<string, LucideIcon> = {
  consoles: Gamepad2,
  games: Gamepad2,
  accessories: Headphones,
  "gaming-accessories": Grid2x2,
  services: Wrench,
};

const sections = [
  ...categories.map(({ slug, name, description, subcategories }) => ({
    slug,
    name,
    description,
    href: categoryMenuHref(slug),
    icon: categoryIcons[slug] ?? Grid2x2,
    links: subcategories.map(item => ({ name: item.name, href: categoryMenuHref(item.slug) })),
  })),
  {
    slug: "used-consoles",
    name: "کنسول‌های کارکرده",
    description: "پلی‌استیشن PS2 تا PS5 با تصاویر و گزارش تست هر دستگاه",
    href: "/used-consoles",
    icon: Gamepad2,
    links: [2, 3, 4, 5].map(generation => ({
      name: `PS${generation}`,
      href: `/used-consoles?generation=playstation-${generation}`,
    })),
  },
];

export default function CategoryBrowser({
  desktop = false,
  onLinkClick,
}: {
  desktop?: boolean;
  onLinkClick: MouseEventHandler<HTMLAnchorElement>;
}) {
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, sections.findIndex(section =>
    section.href === pathname || section.links.some(link => link.href === pathname),
  )));

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target: number;

    switch (event.key) {
      case "ArrowDown": target = (index + 1) % sections.length; break;
      case "ArrowUp": target = (index + sections.length - 1) % sections.length; break;
      case "Home": target = 0; break;
      case "End": target = sections.length - 1; break;
      default: return;
    }

    event.preventDefault();
    setActiveIndex(target);
    tabs.current[target]?.focus();
  }

  return (
    <div dir="rtl" className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 px-3 py-1.5 sm:px-4">
        {desktop && <span className="text-sm font-bold">دسته‌بندی‌ها</span>}
        <Link
          href="/products"
          onClick={onLinkClick}
          className={`ms-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-bold text-blue-700 hover:underline sm:text-sm ${headerControlFocus}`}
        >
          مشاهده همه محصولات
          <ArrowUpLeft aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(0,38%)_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="دسته‌های اصلی"
          aria-orientation="vertical"
          className="min-h-0 space-y-1 overflow-y-auto overscroll-contain border-e border-slate-200 bg-slate-50 p-1.5 sm:p-2.5"
        >
          {sections.map(({ slug, name, icon: Icon }, index) => (
            <button
              key={slug}
              ref={element => { tabs.current[index] = element; }}
              id={`${id}-tab-${slug}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-controls={`${id}-panel-${slug}`}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={event => moveTab(event, index)}
              onPointerEnter={event => {
                if (desktop && event.pointerType === "mouse") setActiveIndex(index);
              }}
              className={`flex min-h-12 w-full items-center gap-1.5 rounded-lg border px-1.5 py-2 text-start text-xs leading-5 transition-colors motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-sm focus-visible:-outline-offset-2 ${headerControlFocus} ${
                activeIndex === index
                  ? "border-blue-200 bg-blue-50 font-bold text-blue-800"
                  : "border-transparent font-medium text-slate-700 hover:bg-white hover:text-blue-700"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
              <ChevronLeft aria-hidden="true" className="ms-auto hidden h-4 w-4 shrink-0 xl:block" />
            </button>
          ))}
        </div>
        {sections.map(({ slug, name, description, href, links }, index) => (
          <section
            key={slug}
            role="tabpanel"
            id={`${id}-panel-${slug}`}
            aria-labelledby={`${id}-tab-${slug}`}
            hidden={activeIndex !== index}
            className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-2.5 sm:p-4"
          >
            {activeIndex === index && (
              <>
                <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">{name}</h3>
                <p className="mt-1 text-xs leading-6 text-slate-600">{description}</p>
                <Link
                  href={href}
                  onClick={onLinkClick}
                  className={`mt-2 inline-flex min-h-11 w-full items-center justify-between gap-1 rounded-lg bg-blue-50 px-2 text-xs font-bold text-blue-800 hover:bg-blue-100 sm:px-3 sm:text-sm ${headerControlFocus}`}
                >
                  مشاهده همهٔ {name}
                  <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                  {links.map((link, linkIndex) => (
                    <li key={link.name} className="min-w-0">
                      <Link
                        href={link.href}
                        onClick={onLinkClick}
                        aria-current={link.href === pathname && link.href !== href && links.findIndex(item => item.href === pathname) === linkIndex ? "page" : undefined}
                        className={`flex min-h-11 items-center justify-between gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-slate-50 hover:text-blue-700 motion-reduce:transition-none sm:px-3 sm:text-sm ${headerControlFocus}`}
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">{link.name}</span>
                        <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
