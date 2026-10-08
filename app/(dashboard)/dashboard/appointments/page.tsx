"use client";

import { FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Check, CheckCircle2, ChevronLeft, ChevronRight, Clipboard, Loader2, Phone, Plus, RefreshCw, Save, Search, Settings2, Sparkles, Store, Truck, X } from "lucide-react";
import type {
  AppointmentItem,
  AppointmentListResponse,
  AppointmentSettings,
  AppointmentStatus,
  CourierStatus,
  RewardSummary,
  RewardType,
  ServiceType,
} from "@/types/appointments";

const weekdayOptions = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

const statusLabel: Record<AppointmentStatus, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

const transitions: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show", "rejected"],
  completed: ["confirmed"],
};

const courierLabel: Record<CourierStatus, string> = {
  pending: "درخواست ثبت شد",
  scheduled: "زمان‌بندی شد",
  assigned: "به پیک اختصاص یافت",
  picked_up: "دستگاه دریافت شد",
  at_store: "به فروشگاه رسید",
  return_ready: "آماده بازگشت",
  returning: "در مسیر بازگشت",
  delivered: "تحویل شد",
  cancelled: "لغو شد",
};

const courierNext: Partial<Record<CourierStatus, CourierStatus[]>> = {
  pending: ["scheduled", "cancelled"],
  scheduled: ["assigned", "picked_up", "cancelled"],
  assigned: ["picked_up", "scheduled", "cancelled"],
  picked_up: ["at_store"],
  at_store: ["return_ready"],
  return_ready: ["returning"],
  returning: ["delivered"],
};

function toman(value: number | null | undefined) {
  if (value === null || value === undefined) return "نامشخص";
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

function rewardLabel(rule: RewardSummary) {
  const reward = rule.reward;
  if (reward.type === "free_game") return "یک نصب بازی رایگان";
  if (reward.type === "free_shipping") return `ارسال رایگان${reward.maxShippingCost ? ` تا سقف ${toman(reward.maxShippingCost)}` : ""}`;
  if (reward.type === "percent") return `${reward.value.toLocaleString("fa-IR")}٪ تخفیف${reward.maxDiscountAmount ? ` تا سقف ${toman(reward.maxDiscountAmount)}` : ""}`;
  return `${toman(reward.value)} تخفیف`;
}

function selectedRewardLabel(item: AppointmentItem) {
  const selected = item.rewardSummary?.selectedReward || item.selectedReward;
  if (selected?.rewardDescription) return selected.rewardDescription;
  const reward = selected?.snapshot?.reward;
  if (!reward) return "";
  return rewardLabel({ _id: selected._id, title: selected.snapshot?.title || "", eligibleServices: selected.snapshot?.eligibleServices || [], reward });
}

export default function AppointmentsAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"appointments" | "courier" | "settings" | "rewards">(
    searchParams.get("fulfillment") === "courier" ? "courier" : "appointments",
  );
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [rules, setRules] = useState<RewardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState({
    status: searchParams.get("status") || "",
    serviceType: searchParams.get("service") || "",
    date: searchParams.get("date") || "",
    search: searchParams.get("search") || "",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  });
  const [listMeta, setListMeta] = useState({ total: 0, pages: 1 });
  const [todaySummary, setTodaySummary] = useState<AppointmentListResponse["today"]>();
  const [working, setWorking] = useState("");
  const [completionAmount, setCompletionAmount] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<AppointmentItem | null>(null);
  const [settlement, setSettlement] = useState<AppointmentItem | null>(null);
  const [activationRule, setActivationRule] = useState<RewardSummary | null>(null);
  const [rewardType, setRewardType] = useState<RewardType>("fixed");
  const deferredSearch = useDeferredValue(filter.search);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.page > 1) params.set("page", String(filter.page));
    if (filter.status) params.set("status", filter.status);
    if (filter.serviceType) params.set("service", filter.serviceType);
    if (filter.date) params.set("date", filter.date);
    if (filter.search) params.set("search", filter.search);
    if (tab === "courier") params.set("fulfillment", "courier");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filter, pathname, router, tab]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(filter.page));
      params.set("limit", "12");
      if (filter.status) params.set("status", filter.status);
      if (filter.serviceType) params.set("serviceType", filter.serviceType);
      if (filter.date) params.set("date", filter.date);
      if (deferredSearch) params.set("search", deferredSearch);
      if (tab === "courier") params.set("fulfillment", "courier");
      const [appointmentsResponse, settingsResponse, rulesResponse] = await Promise.all([
        fetch(`/api/admin/appointments?${params}`, { cache: "no-store" }),
        fetch("/api/admin/appointment-settings", { cache: "no-store" }),
        fetch("/api/admin/visit-reward-rules", { cache: "no-store" }),
      ]);
      if (!appointmentsResponse.ok || !settingsResponse.ok || !rulesResponse.ok) throw new Error("دریافت اطلاعات انجام نشد.");
      const [appointmentsPayload, settingsPayload, rulesPayload] = await Promise.all([
        appointmentsResponse.json(),
        settingsResponse.json(),
        rulesResponse.json(),
      ]);
      setItems(Array.isArray(appointmentsPayload.data.items) ? appointmentsPayload.data.items : []);
      setListMeta({
        total: Number(appointmentsPayload.data.total) || 0,
        pages: Number(appointmentsPayload.data.pages) || 1,
      });
      setTodaySummary(appointmentsPayload.data.today);
      setSettings(settingsPayload.data);
      setRules(Array.isArray(rulesPayload.data) ? rulesPayload.data : []);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "دریافت اطلاعات انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filter.date, filter.page, filter.serviceType, filter.status, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (item: AppointmentItem, status: AppointmentStatus, forcedAmount?: number) => {
    const amount = forcedAmount ?? Number(completionAmount[item._id]);
    if (status === "completed" && (!Number.isInteger(amount) || amount < 0)) {
      setMessage("برای انجام‌شده، مبلغ بررسی‌شده را به تومان وارد کنید.");
      return;
    }
    setWorking(item._id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "completed" ? { baseAmount: amount } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تغییر وضعیت انجام نشد.");
      setSettlement(null);
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "تغییر وضعیت انجام نشد.");
    } finally {
      setWorking("");
    }
  };

  const updateCourierStatus = async (item: AppointmentItem, courierStatus: CourierStatus) => {
    setWorking(item._id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courierStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تغییر وضعیت پیک انجام نشد.");
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "تغییر وضعیت پیک انجام نشد.");
    } finally {
      setWorking("");
    }
  };

  const visibleItems = useMemo(() => {
    const query = filter.search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.customerName, item.phone, item.trackingCode].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [filter.search, items]);

  const pageSummary = useMemo(() => ({
    today: items.filter((item) => new Date(item.startsAt).toDateString() === new Date().toDateString()).length,
    pending: items.filter((item) => item.status === "pending").length,
    completed: items.filter((item) => item.status === "completed").length,
    noShow: items.filter((item) => item.status === "no_show").length,
  }), [items]);

  const saveSettings = async () => {
    if (!settings) return;
    setWorking("settings");
    try {
      const response = await fetch("/api/admin/appointment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "ذخیره تنظیمات انجام نشد.");
      setSettings(payload.data);
      setMessage("تنظیمات ذخیره شد.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "ذخیره تنظیمات انجام نشد.");
    } finally {
      setWorking("");
    }
  };

  const createRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rewardType = String(form.get("rewardType"));
    const response = await fetch("/api/admin/visit-reward-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title")),
        requiredVisits: Number(form.get("requiredVisits")),
        eligibleServices: form.getAll("services"),
        recurrence: String(form.get("recurrence")),
        reward: {
          type: rewardType,
          value: Number(form.get("value")) || 0,
          maxDiscountAmount: Number(form.get("maxDiscountAmount")) || null,
          minAmount: Number(form.get("minAmount")) || 0,
          combinable: form.get("combinable") === "on",
          eligibleDevices: String(form.get("eligibleDevices") || "").split(",").map((item) => item.trim()).filter(Boolean),
          eligibleInstallationTypes: form.getAll("installationTypes"),
          shippingRegion: String(form.get("shippingRegion") || ""),
          maxShippingCost: Number(form.get("maxShippingCost")) || null,
          validityDays: Number(form.get("validityDays")) || 30,
        },
        startsAt: form.get("startsAt") ? String(form.get("startsAt")) : null,
        endsAt: form.get("endsAt") ? String(form.get("endsAt")) : null,
        isActive: false,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "ساخت قانون انجام نشد.");
      return;
    }
    event.currentTarget.reset();
    setMessage("قانون نمونه به‌صورت غیرفعال ساخته شد؛ پس از بازبینی آن را فعال کنید.");
    await load();
  };

  const toggleRule = async (rule: RewardSummary) => {
    const response = await fetch(`/api/admin/visit-reward-rules/${rule._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !Boolean(rule.isActive) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "تغییر وضعیت قانون انجام نشد.");
      return;
    }
    setActivationRule(null);
    setMessage(rule.isActive ? "قانون غیرفعال شد." : "قانون فعال شد.");
    await load();
  };

  return (
    <main className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-l from-[#001A6E] to-blue-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-blue-200">کنترل ظرفیت و پاداش مراجعه</p><h1 className="mt-1 text-2xl font-black">مدیریت نوبت‌ها</h1></div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" /> به‌روزرسانی</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-6">
          {[
            ["نوبت‌های امروز", todaySummary?.total ?? pageSummary.today],
            ["در انتظار تأیید", todaySummary?.pending ?? pageSummary.pending],
            ["انجام‌شده", todaySummary?.completed ?? pageSummary.completed],
            ["عدم مراجعه", todaySummary?.noShow ?? pageSummary.noShow],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white/10 p-3">
              <strong className="block text-xl">{Number(value).toLocaleString("fa-IR")}</strong>
              <span className="text-[11px] text-blue-100">{label}</span>
            </div>
          ))}
          <div className="rounded-2xl bg-white/10 p-3"><strong className="block text-xl">{(todaySummary?.courierPickups ?? 0).toLocaleString("fa-IR")}</strong><span className="text-[11px] text-blue-100">دریافت پیک امروز</span></div>
          <div className="rounded-2xl bg-white/10 p-3"><strong className="block text-xl">{(todaySummary?.courierReturns ?? 0).toLocaleString("fa-IR")}</strong><span className="text-[11px] text-blue-100">بازگشت پیک امروز</span></div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {[
          { key: "appointments", label: "نوبت‌ها", icon: CalendarClock },
          { key: "courier", label: "پیک", icon: Truck },
          { key: "settings", label: "ظرفیت و ساعت کاری", icon: Settings2 },
          { key: "rewards", label: "قواعد پاداش", icon: Sparkles },
        ].map((item) => {
          const Icon = item.icon;
          return <button key={item.key} type="button" onClick={() => setTab(item.key as typeof tab)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${tab === item.key ? "bg-[#001A6E] text-white" : "text-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>;
        })}
      </div>

      {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت…</div>
      ) : tab === "courier" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
            <label className="relative"><span className="sr-only">جست‌وجوی پیک</span><Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" /><input value={filter.search} onChange={(event) => setFilter((value) => ({ ...value, search: event.target.value, page: 1 }))} placeholder="نام، موبایل یا کد پیگیری" className="h-11 w-full rounded-xl border border-slate-200 pr-9 pl-3 text-sm" /></label>
            <select aria-label="فیلتر خدمت پیک" value={filter.serviceType} onChange={(event) => setFilter((value) => ({ ...value, serviceType: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 px-3"><option value="">همه خدمات</option><option value="game_install">نصب بازی</option><option value="repair">تعمیرات</option></select>
            <input aria-label="فیلتر تاریخ پیک" type="date" value={filter.date} onChange={(event) => setFilter((value) => ({ ...value, date: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 px-3" />
          </div>
          {items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-9 text-center"><Truck className="mx-auto h-11 w-11 text-slate-300" /><h2 className="mt-3 font-black text-slate-900">درخواست پیکی پیدا نشد</h2></div> : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => {
                const courier = item.courierSummary || (item.courier ? {
                  status: item.courier.status,
                  pickupDate: item.courier.pickupDate || item.startsAt,
                  pickupWindow: item.courier.pickupWindow || { start: "", end: "" },
                  regionTitle: item.courier.regionTitle || "",
                  shippingBaseAmount: item.pricing?.shippingBaseAmount || item.courier.totalShippingCost || 0,
                  shippingDiscountAmount: item.pricing?.shippingDiscountAmount || item.courier.freeShippingDiscount || 0,
                  shippingFinalAmount: item.pricing?.shippingFinalAmount || item.courier.finalShippingCost || 0,
                  address: {
                    recipientName: item.courier.addressSnapshot?.recipientName || item.customerName,
                    recipientPhone: item.courier.addressSnapshot?.recipientPhone || item.phone,
                    city: item.courier.addressSnapshot?.city || "",
                    address: item.courier.addressSnapshot?.address || "",
                  },
                } : null);
                if (!courier) return null;
                return <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-slate-400" dir="ltr">{item.trackingCode}</p><h2 className="mt-1 font-black text-slate-950">{item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} · {item.device}</h2><p className="mt-1 text-sm font-bold text-[#001A6E]">{courier.pickupWindow.start} تا {courier.pickupWindow.end}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#001A6E]">{courierLabel[courier.status]}</span></div>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-3"><strong>{item.customerName}</strong><a href={`tel:${item.phone}`} dir="ltr" className="text-[#001A6E]">{item.phone}</a></div><p className="mt-2 leading-6 text-slate-600">{courier.address.city}، {courier.address.address}</p><p className="mt-2 text-xs text-slate-500">هزینه پیک: {toman(courier.shippingFinalAmount)}</p></div>
                  <div className="mt-4 flex flex-wrap gap-2">{(courierNext[courier.status] || []).map((status) => <button key={status} type="button" disabled={working === item._id} onClick={() => void updateCourierStatus(item, status)} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${status === "cancelled" ? "border border-rose-200 text-rose-700" : "bg-[#001A6E] text-white"}`}>{courierLabel[status]}</button>)}<button type="button" onClick={() => setDetail(item)} className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">جزئیات</button></div>
                </article>;
              })}
            </div>
          )}
        </section>
      ) : tab === "appointments" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2"><span className="sr-only">جست‌وجو در صفحه جاری</span><Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" /><input value={filter.search} onChange={(event) => setFilter((value) => ({ ...value, search: event.target.value, page: 1 }))} placeholder="نام، موبایل یا کد پیگیری در این صفحه" className="h-11 w-full rounded-xl border border-slate-200 pr-9 pl-3 text-sm" /></label>
            <select aria-label="فیلتر خدمت" value={filter.serviceType} onChange={(event) => setFilter((value) => ({ ...value, serviceType: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 px-3"><option value="">همه خدمات</option><option value="game_install">نصب بازی</option><option value="repair">تعمیرات</option></select>
            <select aria-label="فیلتر وضعیت" value={filter.status} onChange={(event) => setFilter((value) => ({ ...value, status: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 px-3"><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input aria-label="فیلتر تاریخ" type="date" value={filter.date} onChange={(event) => setFilter((value) => ({ ...value, date: event.target.value, page: 1 }))} className="h-11 rounded-xl border border-slate-200 px-3" />
          </div>
          {visibleItems.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">نوبتی با این فیلتر پیدا نشد.</div> : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleItems.map((item) => (
                <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-slate-500" dir="ltr">{item.trackingCode}</p><h2 className="mt-1 font-black text-slate-900">{item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} · {item.device}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{statusLabel[item.status]}</span></div>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">مشتری</dt><dd className="font-bold">{item.customerName}</dd></div><div><dt className="text-xs text-slate-400">موبایل</dt><dd className="flex items-center gap-2 font-bold" dir="ltr"><a href={`tel:${item.phone}`} className="text-[#001A6E]">{item.phone}</a><button type="button" onClick={() => void navigator.clipboard?.writeText(item.phone)} aria-label="کپی شماره"><Clipboard className="h-4 w-4 text-slate-400" /></button></dd></div><div><dt className="text-xs text-slate-400">روش</dt><dd className="flex items-center gap-1 font-bold"><Store className="h-4 w-4 text-[#001A6E]" /> مراجعه حضوری</dd></div><div><dt className="text-xs text-slate-400">زمان</dt><dd className="font-bold">{new Date(item.startsAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</dd></div></dl>
                  {item.description && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{item.description}</p>}
                  {transitions[item.status]?.length ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap gap-2">{(transitions[item.status] ?? []).map((status) => <button key={status} type="button" disabled={working === item._id} onClick={() => status === "completed" ? setSettlement(item) : void updateStatus(item, status)} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${status === "confirmed" || status === "completed" ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-700"}`}>{status === "completed" ? "تکمیل و تسویه" : statusLabel[status]}</button>)}<button type="button" onClick={() => setDetail(item)} className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">جزئیات</button></div>
                    </div>
                  ) : item.pricing?.known ? <p className="mt-4 text-sm font-bold text-emerald-700">مبلغ نهایی: {toman(item.pricing.finalAmount || 0)}</p> : null}
                </article>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <span className="text-slate-500">{listMeta.total.toLocaleString("fa-IR")} درخواست · صفحه {filter.page.toLocaleString("fa-IR")} از {listMeta.pages.toLocaleString("fa-IR")}</span>
            <div className="flex gap-2"><button type="button" disabled={filter.page <= 1} onClick={() => setFilter((value) => ({ ...value, page: value.page - 1 }))} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40"><ChevronRight className="h-4 w-4" /> قبلی</button><button type="button" disabled={filter.page >= listMeta.pages} onClick={() => setFilter((value) => ({ ...value, page: value.page + 1 }))} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40">بعدی <ChevronLeft className="h-4 w-4" /></button></div>
          </div>
        </section>
      ) : tab === "settings" && settings ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["طول هر بازه (دقیقه)", "slotMinutes"],
              ["روزهای قابل رزرو از امروز", "bookingDaysAhead"],
              ["سقف نوبت فعال هر کاربر", "maxActiveAppointmentsPerUser"],
              ["مهلت لغو (دقیقه)", "cancellationNoticeMinutes"],
            ].map(([label, key]) => <label key={key} className="text-sm font-bold text-slate-700">{label}<input type="number" value={settings[key as keyof AppointmentSettings] as number} onChange={(event) => setSettings((value) => value ? { ...value, [key]: Number(event.target.value) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>)}
            <label className="text-sm font-bold text-slate-700">ظرفیت نصب بازی<input type="number" min="1" value={settings.serviceCapacity.game_install} onChange={(event) => setSettings((value) => value ? { ...value, serviceCapacity: { ...value.serviceCapacity, game_install: Number(event.target.value) } } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
            <label className="text-sm font-bold text-slate-700">ظرفیت تعمیرات<input type="number" min="1" value={settings.serviceCapacity.repair} onChange={(event) => setSettings((value) => value ? { ...value, serviceCapacity: { ...value.serviceCapacity, repair: Number(event.target.value) } } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
            <fieldset className="md:col-span-2 xl:col-span-3">
              <legend className="text-sm font-bold text-slate-700">بازه‌های کاری</legend>
              <div className="mt-2 space-y-2">
                {settings.workingBlocks.map((block, index) => (
                  <div key={`${index}-${block.start}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 rounded-2xl bg-slate-50 p-3">
                    <label className="text-xs text-slate-500">شروع<input aria-label={`شروع بازه ${index + 1}`} type="time" value={block.start} onChange={(event) => setSettings((value) => value ? { ...value, workingBlocks: value.workingBlocks.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) } : value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2" /></label>
                    <span className="pb-3 text-slate-400">تا</span>
                    <label className="text-xs text-slate-500">پایان<input aria-label={`پایان بازه ${index + 1}`} type="time" value={block.end} onChange={(event) => setSettings((value) => value ? { ...value, workingBlocks: value.workingBlocks.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) } : value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2" /></label>
                    <button type="button" disabled={settings.workingBlocks.length === 1} onClick={() => setSettings((value) => value ? { ...value, workingBlocks: value.workingBlocks.filter((_, itemIndex) => itemIndex !== index) } : value)} aria-label="حذف بازه" className="mb-1 rounded-xl p-2 text-rose-600 disabled:opacity-30"><X className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
              <button type="button" disabled={settings.workingBlocks.length >= 6} onClick={() => setSettings((value) => value ? { ...value, workingBlocks: [...value.workingBlocks, { start: "09:00", end: "12:00" }] } : value)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-[#001A6E] disabled:opacity-40"><Plus className="h-4 w-4" /> افزودن بازه</button>
            </fieldset>
            <fieldset className="md:col-span-2 xl:col-span-3"><legend className="text-sm font-bold text-slate-700">روزهای تعطیل هفتگی</legend><div className="mt-2 flex flex-wrap gap-2">{weekdayOptions.map((day) => <label key={day.value} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${settings.closedWeekdays.includes(day.value) ? "border-red-200 bg-red-50 font-bold text-red-700" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={settings.closedWeekdays.includes(day.value)} onChange={(event) => setSettings((value) => value ? { ...value, closedWeekdays: event.target.checked ? [...value.closedWeekdays, day.value] : value.closedWeekdays.filter((item) => item !== day.value) } : value)} className="ml-2" />{day.label}</label>)}</div></fieldset>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-3">روزهای بسته (میلادی، جداشده با ویرگول)<input value={settings.closedDates.join(", ")} onChange={(event) => setSettings((value) => value ? { ...value, closedDates: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="2026-10-10, 2026-10-11" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-3">شناسه دستگاه‌های قابل رزرو (با ویرگول)<input value={settings.supportedDevices.join(", ")} onChange={(event) => setSettings((value) => value ? { ...value, supportedDevices: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="ps5, ps4, xbox-series, xbox-one" dir="ltr" /></label>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">ظرفیت هر خدمت جداگانه و اتمیک کنترل می‌شود. تغییر این تنظیمات فقط روی نوبت‌های تازه اثر دارد و نوبت‌های ثبت‌شده را جابه‌جا نمی‌کند.</p>
          <button type="button" onClick={() => void saveSettings()} disabled={working === "settings"} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#001A6E] px-5 font-bold text-white"><Save className="h-4 w-4" /> ذخیره تنظیمات</button>
          {settings.courierWorkingWindows && settings.courierRegions ? <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 font-black text-slate-900"><Truck className="h-5 w-5 text-[#001A6E]" /> تنظیمات پیک</p><p className="mt-1 text-xs text-slate-500">تمام مقادیر از API تنظیمات خوانده و در همان endpoint ذخیره می‌شوند.</p></div><label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold"><input type="checkbox" checked={Boolean(settings.courierEnabled)} onChange={(event) => setSettings((value) => value ? { ...value, courierEnabled: event.target.checked } : value)} /> پیک فعال باشد</label></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">روزهای قابل رزرو<input type="number" min="1" max="60" value={settings.courierBookingDaysAhead || 14} onChange={(event) => setSettings((value) => value ? { ...value, courierBookingDaysAhead: Number(event.target.value) } : value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label><label className="text-sm font-bold text-slate-700">ظرفیت هر بازه<input type="number" min="1" max="50" value={settings.courierCapacityPerWindow || 1} onChange={(event) => setSettings((value) => value ? { ...value, courierCapacityPerWindow: Number(event.target.value) } : value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label></div>
            <fieldset className="mt-4"><legend className="text-sm font-bold text-slate-700">بازه‌های دریافت</legend><div className="mt-2 space-y-2">{settings.courierWorkingWindows.map((window, index) => <div key={`${index}-${window.start}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 rounded-xl bg-white p-3"><label className="text-xs text-slate-500">شروع<input type="time" value={window.start} onChange={(event) => setSettings((value) => value ? { ...value, courierWorkingWindows: value.courierWorkingWindows?.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) } : value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2" /></label><span className="pb-3 text-slate-400">تا</span><label className="text-xs text-slate-500">پایان<input type="time" value={window.end} onChange={(event) => setSettings((value) => value ? { ...value, courierWorkingWindows: value.courierWorkingWindows?.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) } : value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2" /></label><button type="button" disabled={(settings.courierWorkingWindows?.length || 0) <= 1} onClick={() => setSettings((value) => value ? { ...value, courierWorkingWindows: value.courierWorkingWindows?.filter((_, itemIndex) => itemIndex !== index) } : value)} className="mb-1 p-2 text-rose-600 disabled:opacity-30"><X className="h-4 w-4" /></button></div>)}</div><button type="button" onClick={() => setSettings((value) => value ? { ...value, courierWorkingWindows: [...(value.courierWorkingWindows || []), { start: "09:00", end: "13:00" }] } : value)} className="mt-2 inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-[#001A6E]"><Plus className="h-4 w-4" /> افزودن بازه</button></fieldset>
            <div className="mt-4"><h3 className="text-sm font-bold text-slate-700">مناطق تحت پوشش</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{settings.courierRegions.map((region, index) => <div key={region.id} className="rounded-xl bg-white p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">{region.title}</strong><label className="text-xs"><input type="checkbox" checked={region.isActive} onChange={(event) => setSettings((value) => value ? { ...value, courierRegions: value.courierRegions?.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item) } : value)} className="ml-1" /> فعال</label></div><p className="mt-1 text-xs text-slate-500">{region.city}</p><label className="mt-2 block text-xs text-slate-500">هزینه یک مسیر<input type="number" min="0" value={region.shippingCost} onChange={(event) => setSettings((value) => value ? { ...value, courierRegions: value.courierRegions?.map((item, itemIndex) => itemIndex === index ? { ...item, shippingCost: Number(event.target.value) } : item) } : value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2" /></label></div>)}</div></div>
          </div> : null}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <form onSubmit={(event) => void createRule(event)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-900">قانون جدید (غیرفعال)</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500">هیچ مقدار نمونه‌ای به‌صورت خودکار فعال نمی‌شود.</p>
            <div className="mt-4 space-y-3">
              <input required name="title" placeholder="عنوان پاداش" className="h-11 w-full rounded-xl border border-slate-200 px-3" />
              <div className="grid grid-cols-2 gap-3"><input required name="requiredVisits" type="number" min="1" placeholder="تعداد مراجعه" className="h-11 rounded-xl border border-slate-200 px-3" /><input required name="validityDays" type="number" min="1" defaultValue="30" placeholder="اعتبار (روز)" className="h-11 rounded-xl border border-slate-200 px-3" /></div>
              <div className="flex gap-4 text-sm"><label><input type="checkbox" name="services" value="game_install" defaultChecked /> نصب بازی</label><label><input type="checkbox" name="services" value="repair" defaultChecked /> تعمیرات</label></div>
              <select name="recurrence" className="h-11 w-full rounded-xl border border-slate-200 px-3"><option value="once">یک‌باره</option><option value="repeat">تکرارشونده</option></select>
              <label className="block text-sm font-bold text-slate-700">نوع پاداش<select name="rewardType" value={rewardType} onChange={(event) => setRewardType(event.target.value as RewardType)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"><option value="fixed">تخفیف مبلغی</option><option value="percent">تخفیف درصدی</option><option value="free_game">یک نصب بازی رایگان</option><option value="free_shipping">ارسال رایگان</option></select></label>
              {rewardType === "fixed" && <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">مبلغ تخفیف<input name="value" type="number" min="0" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-xs font-bold text-slate-600">حداقل مبلغ<input name="minAmount" type="number" min="0" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label></div>}
              {rewardType === "percent" && <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">درصد تخفیف<input name="value" type="number" min="0" max="100" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-xs font-bold text-slate-600">سقف تخفیف<input name="maxDiscountAmount" type="number" min="0" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-xs font-bold text-slate-600">حداقل مبلغ<input name="minAmount" type="number" min="0" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label></div>}
              {rewardType === "free_game" && <div className="space-y-3"><input name="eligibleDevices" placeholder="شناسه دستگاه‌ها (خالی = همه)" className="h-11 w-full rounded-xl border border-slate-200 px-3" dir="ltr" /><div className="flex flex-wrap gap-4 text-sm"><span className="font-bold text-slate-600">نوع نصب:</span><label><input type="checkbox" name="installationTypes" value="account" className="ml-1" /> اکانتی</label><label><input type="checkbox" name="installationTypes" value="copy" className="ml-1" /> کپی‌خور</label></div></div>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="combinable" /> قابل ترکیب با تخفیف دیگر</label>
              <div className="grid gap-3 sm:grid-cols-2"><input name="startsAt" type="datetime-local" aria-label="شروع اعتبار" className="h-11 rounded-xl border border-slate-200 px-3" /><input name="endsAt" type="datetime-local" aria-label="پایان اعتبار" className="h-11 rounded-xl border border-slate-200 px-3" /></div>
              {rewardType === "free_shipping" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">محدوده ارسال<input name="shippingRegion" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-xs font-bold text-slate-600">سقف هزینه ارسال<input name="maxShippingCost" type="number" min="0" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label></div>}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-950"><strong className="block">پیش‌نمایش</strong><span>بعد از تعداد مراجعه تعیین‌شده، «{rewardType === "percent" ? "تخفیف درصدی" : rewardType === "fixed" ? "تخفیف مبلغی" : rewardType === "free_game" ? "نصب بازی رایگان" : "ارسال رایگان"}» صادر می‌شود.</span>{rewardType === "free_shipping" && <span className="block text-xs text-blue-700">قابل استفاده فقط برای سفارش با پیک؛ در حال حاضر API پیک فعال نیست.</span>}</div>
              <button className="h-11 w-full rounded-xl bg-[#001A6E] font-bold text-white">ساخت قانون غیرفعال</button>
            </div>
          </form>
          <div className="space-y-3">
            {rules.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">قانونی تعریف نشده است.</div> : rules.map((rule) => (
              <article key={rule._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{rule.title}</h3><p className="mt-1 text-xs text-slate-500">{Number(rule.requiredVisits || 0).toLocaleString("fa-IR")} مراجعه · {rule.recurrence === "repeat" ? "تکرارشونده" : "یک‌باره"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.isActive ? "فعال" : "غیرفعال"}</span></div><div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-900">{rewardLabel(rule)}</p><p className="mt-1 text-xs text-slate-500">اعتبار: {rule.reward.validityDays.toLocaleString("fa-IR")} روز</p></div><button type="button" onClick={() => rule.isActive ? void toggleRule(rule) : setActivationRule(rule)} className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{rule.isActive ? "غیرفعال‌کردن" : "بازبینی و فعال‌سازی"}</button></article>
            ))}
          </div>
        </section>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}>
          <aside role="dialog" aria-modal="true" aria-label="جزئیات درخواست" className="mr-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-4">
              <div><h2 className="font-black text-slate-950">جزئیات درخواست</h2><p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">{detail.trackingCode}</p></div>
              <button type="button" onClick={() => setDetail(null)} aria-label="بستن جزئیات" className="rounded-xl p-2 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-blue-200"><X className="h-5 w-5" /></button>
            </header>
            <div className="space-y-4 p-5">
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">اطلاعات درخواست</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">خدمت</dt><dd className="font-bold">{detail.serviceType === "repair" ? "تعمیرات" : "نصب بازی"}</dd></div><div><dt className="text-xs text-slate-400">دستگاه</dt><dd className="font-bold">{detail.device}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-400">زمان مراجعه</dt><dd className="font-bold">{new Date(detail.startsAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</dd></div></dl>{detail.description && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{detail.description}</p>}</section>
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">مشتری</h3><div className="mt-3 flex items-center justify-between gap-3"><div><p className="font-bold">{detail.customerName}</p><a href={`tel:${detail.phone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-[#001A6E]" dir="ltr"><Phone className="h-4 w-4" />{detail.phone}</a></div><button type="button" onClick={() => void navigator.clipboard?.writeText(detail.phone)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><Clipboard className="h-4 w-4" /> کپی</button></div>{detail.customerSummary ? <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><div><dt className="text-[11px] text-slate-400">کل مراجعات</dt><dd className="font-black">{detail.customerSummary.totalCompletedVisits.toLocaleString("fa-IR")}</dd></div><div><dt className="text-[11px] text-slate-400">نصب بازی</dt><dd className="font-black">{detail.customerSummary.gameInstallVisits.toLocaleString("fa-IR")}</dd></div><div><dt className="text-[11px] text-slate-400">تعمیر</dt><dd className="font-black">{detail.customerSummary.repairVisits.toLocaleString("fa-IR")}</dd></div></dl> : null}</section>
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">پاداش انتخاب‌شده</h3>{(detail.rewardSummary?.selectedReward || detail.selectedReward) ? <div className="mt-3 rounded-xl bg-amber-50 p-3"><p className="font-bold text-amber-950">{detail.selectedReward?.snapshot?.title || "پاداش انتخاب‌شده"}</p><p className="mt-1 text-sm text-amber-800">{selectedRewardLabel(detail)}</p><p className="mt-1 text-xs text-amber-700">وضعیت: {(detail.rewardSummary?.selectedReward || detail.selectedReward)?.status === "reserved" ? "رزرو شده" : (detail.rewardSummary?.selectedReward || detail.selectedReward)?.status || "اعلام نشده"}</p></div> : <p className="mt-3 text-sm text-slate-500">پاداشی انتخاب نشده است.</p>}{detail.rewardSummary?.progress?.length ? <div className="mt-3 space-y-2">{detail.rewardSummary.progress.map((progress) => <div key={progress.ruleId} className="rounded-xl bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-800">{progress.title}</p><p className="mt-1 text-slate-500">{progress.completedVisits.toLocaleString("fa-IR")} از {progress.requiredVisits.toLocaleString("fa-IR")} مراجعه · {progress.remaining ? `${progress.remaining.toLocaleString("fa-IR")} مراجعه مانده` : "تکمیل‌شده"}</p>{progress.willEarnOnCompletion && <p className="mt-1 font-bold text-emerald-700">با تکمیل این درخواست پاداش صادر می‌شود.</p>}</div>)}</div> : <p className="mt-3 text-xs leading-6 text-slate-500">پیشرفت پاداشی برای این مشتری اعلام نشده است.</p>}</section>
              {detail.fulfillment === "courier" && (detail.courierSummary || detail.courier) && <section className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4"><h3 className="flex items-center gap-2 font-black text-slate-900"><Truck className="h-5 w-5 text-cyan-700" /> پیک</h3><div className="mt-3 text-sm leading-7 text-slate-700"><p><strong>تحویل‌گیرنده:</strong> {detail.courierSummary?.address.recipientName || detail.courier?.addressSnapshot?.recipientName}</p><p><strong>تماس:</strong> {detail.courierSummary?.address.recipientPhone || detail.courier?.addressSnapshot?.recipientPhone}</p><p><strong>آدرس:</strong> {detail.courierSummary?.address.city || detail.courier?.addressSnapshot?.city}، {detail.courierSummary?.address.address || detail.courier?.addressSnapshot?.address}</p></div></section>}
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">مالی</h3>{detail.pricing ? <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">هزینه خدمت</dt><dd className="font-bold">{detail.pricing.known ? toman(detail.pricing.serviceBaseAmount ?? detail.pricing.baseAmount) : "پس از بررسی"}</dd></div><div className="flex justify-between"><dt className="text-slate-500">تخفیف خدمت</dt><dd className="font-bold text-rose-600">{toman(detail.pricing.serviceDiscountAmount ?? 0)}</dd></div>{detail.fulfillment === "courier" && <><div className="flex justify-between border-t border-slate-100 pt-2"><dt className="text-slate-500">هزینه پیک</dt><dd className="font-bold">{toman(detail.pricing.shippingBaseAmount ?? 0)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">تخفیف ارسال</dt><dd className="font-bold text-rose-600">{toman(detail.pricing.shippingDiscountAmount ?? 0)}</dd></div></>}<div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-bold">مبلغ نهایی</dt><dd className="font-black text-emerald-700">{detail.pricing.finalAmount === null ? "پس از بررسی خدمت" : toman(detail.pricing.finalAmount)}</dd></div></dl> : <p className="mt-3 text-sm text-slate-500">اطلاعات مالی موجود نیست.</p>}</section>
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-black text-slate-900">تاریخچه</h3>{detail.history?.length ? <ol className="mt-3 space-y-3">{detail.history.map((entry, index) => <li key={`${entry.at}-${index}`} className="border-r-2 border-blue-100 pr-3"><p className="text-sm font-bold">{statusLabel[entry.to]}</p><p className="text-xs text-slate-500">{new Date(entry.at).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}{entry.note ? ` · ${entry.note}` : ""}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">تاریخچه‌ای ثبت نشده است.</p>}</section>
            </div>
          </aside>
        </div>
      )}

      {settlement && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-label="تکمیل و تسویه" className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between"><h2 className="font-black text-slate-950">تکمیل و تسویه</h2><button type="button" onClick={() => setSettlement(null)} aria-label="بستن"><X className="h-5 w-5" /></button></div>
            <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-950">Frontend فقط مبلغ واقعی خدمت را ارسال می‌کند؛ تخفیف و مبلغ نهایی را Server محاسبه می‌کند.</p>
            {settlement.fulfillment === "courier" && <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><dt>هزینه پیک</dt><dd className="font-bold">{toman(settlement.pricing?.shippingBaseAmount ?? settlement.courier?.totalShippingCost ?? 0)}</dd></div><div className="flex justify-between"><dt>تخفیف ارسال</dt><dd className="font-bold text-rose-600">{toman(settlement.pricing?.shippingDiscountAmount ?? settlement.courier?.freeShippingDiscount ?? 0)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-2"><dt>پیک قابل پرداخت</dt><dd className="font-black">{toman(settlement.pricing?.shippingFinalAmount ?? settlement.courier?.finalShippingCost ?? 0)}</dd></div></dl>}
            <label className="mt-4 block text-sm font-bold text-slate-700">مبلغ خدمت (تومان)<input autoFocus type="number" min="0" value={completionAmount[settlement._id] || ""} onChange={(event) => setCompletionAmount((value) => ({ ...value, [settlement._id]: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
            {selectedRewardLabel(settlement) && <div className="mt-4 rounded-2xl bg-amber-50 p-4"><p className="text-xs text-amber-700">پاداش رزروشده</p><p className="font-bold text-amber-950">{selectedRewardLabel(settlement)}</p></div>}
            <p className="mt-4 text-xs leading-6 text-slate-500">API پیش‌نمایش مالی ندارد؛ breakdown نهایی فقط بعد از پاسخ Server نمایش داده می‌شود.</p>
            <div className="mt-5 flex gap-2"><button type="button" onClick={() => setSettlement(null)} className="h-11 flex-1 rounded-xl border border-slate-200 font-bold">انصراف</button><button type="button" disabled={working === settlement._id} onClick={() => void updateStatus(settlement, "completed")} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#001A6E] font-bold text-white disabled:opacity-50"><Check className="h-4 w-4" /> ثبت تسویه</button></div>
          </section>
        </div>
      )}

      {activationRule && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-label="فعال‌سازی قانون پاداش" className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between"><h2 className="font-black text-slate-950">فعال‌سازی قانون</h2><button type="button" onClick={() => setActivationRule(null)} aria-label="بستن"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4"><h3 className="font-black">{activationRule.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">بعد از هر {Number(activationRule.requiredVisits || 0).toLocaleString("fa-IR")} مراجعه، {rewardLabel(activationRule)} صادر می‌شود.</p><p className="text-sm text-slate-500">اعتبار: {activationRule.reward.validityDays.toLocaleString("fa-IR")} روز</p></div>
            <div className="mt-5 flex gap-2"><button type="button" onClick={() => setActivationRule(null)} className="h-11 flex-1 rounded-xl border border-slate-200 font-bold">بازگشت</button><button type="button" onClick={() => void toggleRule(activationRule)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white"><CheckCircle2 className="h-4 w-4" /> تأیید و فعال‌سازی</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
