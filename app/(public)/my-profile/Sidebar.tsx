"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CalendarClock,
  Dices,
  Gift,
  Heart,
  KeyRound,
  MapPinHouse,
  Menu,
  MessageCircle,
  MessageSquareText,
  ShoppingBasket,
  Trophy,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "@/app/components/navigation/NavigationFeedback";
import { PROFILE_STEPS, profileRoute, type ProfileSection } from "@/lib/profileRoutes";

const entries: { section: ProfileSection; title: string; icon: LucideIcon }[] = [
  { section: "profile", title: "اطلاعات شخصی", icon: UserRound },
  { section: "orders", title: "سفارش‌های من", icon: ShoppingBasket },
  { section: "accounts", title: "اکانت‌های من", icon: KeyRound },
  { section: "appointments", title: "دریافت نوبت", icon: CalendarClock },
  { section: "wallet", title: "کیف پول و پرداخت", icon: WalletCards },
  { section: "addresses", title: "آدرس‌ها", icon: MapPinHouse },
  { section: "favorites", title: "علاقه‌مندی‌ها", icon: Heart },
  { section: "comments", title: "نظرات من", icon: MessageSquareText },
  { section: "loyalty", title: "باشگاه مشتریان", icon: Trophy },
  { section: "spin", title: "گردونه شانس", icon: Dices },
  { section: "conversations", title: "گفتگوهای پشتیبانی", icon: MessageCircle },
];

export default function Sidebar({ activeStep }: { activeStep: number }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const linksId = useId();
  const currentSection = entries.find(({ section }) => PROFILE_STEPS[section] === activeStep);
  const ToggleIcon = open ? X : Menu;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  function closeMenu() {
    if (!open) return;
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  }

  return (
    <nav
      ref={navRef}
      aria-label="منوی پنل کاربری"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeMenu();
        }
      }}
      className="relative z-40 h-fit min-w-0 self-start rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm sm:p-3 lg:sticky lg:top-24 lg:z-auto lg:p-4"
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={linksId}
        onClick={() => setOpen(current => !current)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 lg:hidden"
      >
        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
          <ToggleIcon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="block text-sm font-bold text-slate-800">منوی پنل کاربری</span>
          {currentSection && <span className="block text-xs leading-5 text-slate-600">{currentSection.title}</span>}
        </span>
      </button>
      <ul
        id={linksId}
        className={`absolute inset-x-0 top-full mt-2 grid max-h-[50dvh] grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-lg transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none sm:grid-cols-3 sm:p-3 lg:pointer-events-auto lg:visible lg:static lg:mt-0 lg:max-h-none lg:translate-y-0 lg:grid-cols-1 lg:overflow-visible lg:rounded-none lg:border-0 lg:p-0 lg:opacity-100 lg:shadow-none lg:transition-none ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0"
        }`}
      >
        {entries.map(({ section, title, icon: Icon }) => {
          const isActive = activeStep === PROFILE_STEPS[section];
          return (
            <li key={section} className="min-w-0">
              <Link
                href={profileRoute(section)}
                scroll={false}
                prefetch={false}
                onClick={closeMenu}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm ${
                  isActive
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-transparent bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                }`}
              >
                <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${isActive ? "" : "text-indigo-600"}`} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <Link href={profileRoute("loyalty")} scroll={false} prefetch={false} onClick={closeMenu} className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-xs font-semibold leading-5 text-indigo-800 hover:border-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm">
            <Gift aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">دعوت از دوستان</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
