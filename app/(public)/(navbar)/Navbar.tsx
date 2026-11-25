import Image from "next/image";
import Link from "@/app/components/navigation/NavigationFeedback";
import DesktopNavigation from "./DesktopNavigation";
import DesktopSearch from "./DesktopSearch";
import HeaderActions from "./HeaderActions";
import MobileNavigation, { MobileMenuTrigger } from "./MobileNavigation";
import NotificationBell from "@/app/components/notifications/NotificationBell";
import { headerControlFocus } from "./navigationItems";

export default function Navbar() {
  return (
    <MobileNavigation>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 shadow-lg backdrop-blur-md xl:-top-3 xl:shadow-sm">
        <div className="mx-auto flex items-center justify-between gap-2 px-2 py-2 sm:px-3 md:px-10 xl:grid xl:max-w-[1440px] xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(22rem,max-content)] xl:gap-6 xl:pb-3 xl:pt-4">
          <Link
            href="/"
            aria-label="صفحه اصلی کرمان آتاری"
            className={`flex min-w-0 items-center gap-2 xl:w-fit xl:rounded-lg ${headerControlFocus}`}
          >
            <Image width={32} height={32} alt="لوگوی کرمان آتاری" src="/atari-seeklogo.svg" priority />
            <span className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:block md:text-lg">
              Kerman Atari
            </span>
          </Link>

          <DesktopSearch />

          <div className="relative flex shrink-0 items-center gap-1.5 md:gap-4 xl:justify-self-end xl:gap-2">
            <NotificationBell />
            <HeaderActions />
            <MobileMenuTrigger />
          </div>
        </div>
        <DesktopNavigation />
      </header>
    </MobileNavigation>
  );
}
