import {
  CalendarClock,
  Dices,
  Gift,
  Heart,
  KeyRound,
  MapPinHouse,
  MessageCircle,
  MessageSquareText,
  ShoppingBasket,
  Trophy,
  UserRound,
  WalletCards,
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
  return (
    <nav aria-label="منوی پنل کاربری" className="h-fit min-w-0 self-start rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm sm:p-3 lg:sticky lg:top-24 lg:p-4">
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
        {entries.map(({ section, title, icon: Icon }) => {
          const isActive = activeStep === PROFILE_STEPS[section];
          return (
            <li key={section} className="min-w-0">
              <Link
                href={profileRoute(section)}
                scroll={false}
                prefetch={false}
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
          <Link href={profileRoute("loyalty")} scroll={false} prefetch={false} className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-xs font-semibold leading-5 text-indigo-800 hover:border-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm">
            <Gift aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">دعوت از دوستان</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
