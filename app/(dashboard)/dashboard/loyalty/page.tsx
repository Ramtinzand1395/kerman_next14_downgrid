"use client";
// app/(dashboard)/dashboard/loyalty/page.tsx
// پنل مدیریت باشگاه مشتریان و کیف پول — همه بخش‌ها در قالب تب
import { useState } from "react";
import {
  BadgeCheck,
  Crown,
  Dices,
  Gift,
  LineChart,
  Megaphone,
  Percent,
  Settings2,
  Sparkles,
  Target,
  Ticket,
  Wallet,
} from "lucide-react";
import WalletTab from "./tabs/WalletTab";
import CouponsTab from "./tabs/CouponsTab";
import MissionsTab from "./tabs/MissionsTab";
import CashbackTab from "./tabs/CashbackTab";
import SpinTab from "./tabs/SpinTab";
import LevelsTab from "./tabs/LevelsTab";
import XpVipTab from "./tabs/XpVipTab";
import { AchievementsTab, CampaignsTab } from "./tabs/MiscTabs";
import { ReportsTab, SettingsTab } from "./tabs/SettingsReportsTabs";

const TABS = [
  { key: "wallet", label: "کیف پول", icon: Wallet, component: WalletTab },
  { key: "coupons", label: "کوپن‌ها", icon: Ticket, component: CouponsTab },
  { key: "missions", label: "ماموریت‌ها", icon: Target, component: MissionsTab },
  { key: "cashback", label: "کش‌بک", icon: Percent, component: CashbackTab },
  { key: "spin", label: "گردونه شانس", icon: Dices, component: SpinTab },
  { key: "levels", label: "سطوح و VIP", icon: Crown, component: LevelsTab },
  { key: "xp-vip", label: "اعطای XP / VIP", icon: Gift, component: XpVipTab },
  { key: "achievements", label: "نشان‌ها", icon: BadgeCheck, component: AchievementsTab },
  { key: "campaigns", label: "کمپین‌ها", icon: Megaphone, component: CampaignsTab },
  { key: "settings", label: "تنظیمات", icon: Settings2, component: SettingsTab },
  { key: "reports", label: "گزارش‌ها", icon: LineChart, component: ReportsTab },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function LoyaltyAdminPage() {
  const [tab, setTab] = useState<TabKey>("wallet");
  const Active = TABS.find((t) => t.key === tab)!.component;

  return (
    <div className="space-y-5 p-1 md:p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-100 p-3">
          <Sparkles className="h-6 w-6 text-indigo-600" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-800">باشگاه مشتریان و کیف پول</h1>
          <p className="text-xs text-slate-500">
            مدیریت امتیاز، سطوح، کش‌بک، کوپن، ماموریت‌ها و گزارش‌ها
          </p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition ${
              tab === key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
