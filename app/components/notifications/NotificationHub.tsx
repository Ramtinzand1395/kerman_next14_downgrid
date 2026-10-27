"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BellRing, History, MessageCircle, Send } from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import ConversationCenter from "./ConversationCenter";
import CampaignHistory from "./CampaignHistory";
import CampaignComposer from "./CampaignComposer";

type Tab = "inbox" | "conversations" | "sent" | "compose";

const tabs = [
  { id: "inbox" as const, label: "نیازمند رسیدگی", icon: BellRing },
  { id: "conversations" as const, label: "گفتگو با مشتریان", icon: MessageCircle },
  { id: "sent" as const, label: "پیام‌های ارسالی", icon: History },
  { id: "compose" as const, label: "ارسال پیام", icon: Send },
];

export default function NotificationHub() {
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const [active, setActive] = useState<Tab>(tabs.some((tab) => tab.id === requested) ? requested! : "inbox");
  const { data: session } = useSession();
  const privileged = session?.user.role === "superadmin";

  return <div className="space-y-5 p-4 md:p-6">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-indigo-950 to-indigo-700 p-5 text-white shadow-lg md:p-7"><p className="text-sm font-bold text-indigo-200">CRM داخلی فروشگاه</p><h1 className="mt-2 text-2xl font-black md:text-3xl">مرکز پیام‌ها و اعلان‌ها</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100">رویدادها، گفتگوهای مشتری و ارسال‌های گروهی را با سابقهٔ قابل پیگیری مدیریت کنید.</p></header>
    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:grid-cols-4" aria-label="بخش‌های مرکز پیام">{tabs.map((tab) => { const Icon = tab.icon; const locked = !privileged && tab.id !== "inbox"; return <button key={tab.id} type="button" disabled={locked} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${active === tab.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}</nav>
    {active === "inbox" ? <NotificationCenter title="نیازمند رسیدگی" adminActions /> : null}
    {active === "conversations" && privileged ? <ConversationCenter admin /> : null}
    {active === "sent" && privileged ? <CampaignHistory /> : null}
    {active === "compose" && privileged ? <CampaignComposer /> : null}
  </div>;
}
