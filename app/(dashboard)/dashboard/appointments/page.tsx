"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, RefreshCw, Save, Settings2, Sparkles } from "lucide-react";

type Appointment = {
  _id: string;
  trackingCode: string;
  serviceType: "game_install" | "repair";
  device: string;
  repairIssue?: string;
  installationType?: string;
  description?: string;
  customerName: string;
  phone: string;
  startsAt: string;
  status: string;
  pricing?: { known: boolean; finalAmount?: number };
};

type Settings = {
  slotMinutes: number;
  bookingDaysAhead: number;
  workingBlocks: Array<{ start: string; end: string }>;
  closedWeekdays: number[];
  serviceCapacity: { game_install: number; repair: number };
  maxActiveAppointmentsPerUser: number;
  cancellationNoticeMinutes: number;
  closedDates: string[];
  supportedDevices: string[];
};

const weekdayOptions = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

const statusLabel: Record<string, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

const transitions: Record<string, string[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show", "rejected"],
  completed: ["confirmed"],
};

function toman(value: number) {
  return `${Math.round(value || 0).toLocaleString("fa-IR")} تومان`;
}

export default function AppointmentsAdminPage() {
  const [tab, setTab] = useState<"appointments" | "settings" | "rewards">("appointments");
  const [items, setItems] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState({ status: "", serviceType: "", date: "" });
  const [working, setWorking] = useState("");
  const [completionAmount, setCompletionAmount] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.serviceType) params.set("serviceType", filter.serviceType);
      if (filter.date) params.set("date", filter.date);
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
      setItems(appointmentsPayload.data.items);
      setSettings(settingsPayload.data);
      setRules(rulesPayload.data);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "دریافت اطلاعات انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [filter.date, filter.serviceType, filter.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (item: Appointment, status: string) => {
    const amount = Number(completionAmount[item._id]);
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
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "تغییر وضعیت انجام نشد.");
    } finally {
      setWorking("");
    }
  };

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

  const toggleRule = async (rule: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/visit-reward-rules/${String(rule._id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "تغییر وضعیت قانون انجام نشد.");
      return;
    }
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
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {[
          { key: "appointments", label: "نوبت‌ها", icon: CalendarClock },
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
      ) : tab === "appointments" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
            <select value={filter.serviceType} onChange={(event) => setFilter((value) => ({ ...value, serviceType: event.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3"><option value="">همه خدمات</option><option value="game_install">نصب بازی</option><option value="repair">تعمیرات</option></select>
            <select value={filter.status} onChange={(event) => setFilter((value) => ({ ...value, status: event.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3"><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input type="date" value={filter.date} onChange={(event) => setFilter((value) => ({ ...value, date: event.target.value }))} className="h-11 rounded-xl border border-slate-200 px-3" />
          </div>
          {items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">نوبتی با این فیلتر پیدا نشد.</div> : (
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => (
                <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-slate-500" dir="ltr">{item.trackingCode}</p><h2 className="mt-1 font-black text-slate-900">{item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} · {item.device}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{statusLabel[item.status]}</span></div>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">مشتری</dt><dd className="font-bold">{item.customerName}</dd></div><div><dt className="text-xs text-slate-400">موبایل</dt><dd className="font-bold" dir="ltr">{item.phone}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-400">زمان</dt><dd className="font-bold">{new Date(item.startsAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</dd></div></dl>
                  {item.description && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{item.description}</p>}
                  {transitions[item.status]?.length ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {transitions[item.status].includes("completed") && <label className="block text-xs font-bold text-slate-600">مبلغ بررسی‌شده (تومان)<input type="number" min="0" value={completionAmount[item._id] || ""} onChange={(event) => setCompletionAmount((value) => ({ ...value, [item._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="صفر به معنی رایگان قطعی نیست؛ مبلغ واقعی را وارد کنید" /></label>}
                      <div className="flex flex-wrap gap-2">{transitions[item.status].map((status) => <button key={status} type="button" disabled={working === item._id} onClick={() => void updateStatus(item, status)} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${status === "confirmed" || status === "completed" ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-700"}`}>{statusLabel[status]}</button>)}</div>
                    </div>
                  ) : item.pricing?.known ? <p className="mt-4 text-sm font-bold text-emerald-700">مبلغ نهایی: {toman(item.pricing.finalAmount || 0)}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : tab === "settings" && settings ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["طول هر بازه (دقیقه)", "slotMinutes"],
              ["روزهای قابل رزرو از امروز", "bookingDaysAhead"],
              ["سقف نوبت فعال هر کاربر", "maxActiveAppointmentsPerUser"],
              ["مهلت لغو (دقیقه)", "cancellationNoticeMinutes"],
            ].map(([label, key]) => <label key={key} className="text-sm font-bold text-slate-700">{label}<input type="number" value={settings[key as keyof Settings] as number} onChange={(event) => setSettings((value) => value ? { ...value, [key]: Number(event.target.value) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>)}
            <label className="text-sm font-bold text-slate-700">ظرفیت نصب بازی<input type="number" min="1" value={settings.serviceCapacity.game_install} onChange={(event) => setSettings((value) => value ? { ...value, serviceCapacity: { ...value.serviceCapacity, game_install: Number(event.target.value) } } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
            <label className="text-sm font-bold text-slate-700">ظرفیت تعمیرات<input type="number" min="1" value={settings.serviceCapacity.repair} onChange={(event) => setSettings((value) => value ? { ...value, serviceCapacity: { ...value.serviceCapacity, repair: Number(event.target.value) } } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-3">بازه‌های کاری (هر بازه به‌شکل 09:00-12:00 و با ویرگول جدا شود)<input value={settings.workingBlocks.map((block) => `${block.start}-${block.end}`).join(", ")} onChange={(event) => setSettings((value) => value ? { ...value, workingBlocks: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => { const [start, end] = item.split("-").map((part) => part.trim()); return { start, end }; }) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="09:00-12:00, 16:00-20:00" dir="ltr" /></label>
            <fieldset className="md:col-span-2 xl:col-span-3"><legend className="text-sm font-bold text-slate-700">روزهای تعطیل هفتگی</legend><div className="mt-2 flex flex-wrap gap-2">{weekdayOptions.map((day) => <label key={day.value} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${settings.closedWeekdays.includes(day.value) ? "border-red-200 bg-red-50 font-bold text-red-700" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={settings.closedWeekdays.includes(day.value)} onChange={(event) => setSettings((value) => value ? { ...value, closedWeekdays: event.target.checked ? [...value.closedWeekdays, day.value] : value.closedWeekdays.filter((item) => item !== day.value) } : value)} className="ml-2" />{day.label}</label>)}</div></fieldset>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-3">روزهای بسته (میلادی، جداشده با ویرگول)<input value={settings.closedDates.join(", ")} onChange={(event) => setSettings((value) => value ? { ...value, closedDates: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="2026-10-10, 2026-10-11" /></label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-3">شناسه دستگاه‌های قابل رزرو (با ویرگول)<input value={settings.supportedDevices.join(", ")} onChange={(event) => setSettings((value) => value ? { ...value, supportedDevices: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" placeholder="ps5, ps4, xbox-series, xbox-one" dir="ltr" /></label>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">ظرفیت هر خدمت جداگانه و اتمیک کنترل می‌شود. تغییر این تنظیمات فقط روی نوبت‌های تازه اثر دارد و نوبت‌های ثبت‌شده را جابه‌جا نمی‌کند.</p>
          <button type="button" onClick={() => void saveSettings()} disabled={working === "settings"} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#001A6E] px-5 font-bold text-white"><Save className="h-4 w-4" /> ذخیره تنظیمات</button>
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
              <select name="rewardType" className="h-11 w-full rounded-xl border border-slate-200 px-3"><option value="fixed">تخفیف مبلغی</option><option value="percent">تخفیف درصدی</option><option value="free_game">یک نصب بازی رایگان</option><option value="free_shipping">ارسال رایگان</option></select>
              <div className="grid grid-cols-3 gap-2"><input name="value" type="number" min="0" placeholder="مقدار" className="h-11 min-w-0 rounded-xl border border-slate-200 px-3" /><input name="maxDiscountAmount" type="number" min="0" placeholder="سقف" className="h-11 min-w-0 rounded-xl border border-slate-200 px-3" /><input name="minAmount" type="number" min="0" placeholder="حداقل مبلغ" className="h-11 min-w-0 rounded-xl border border-slate-200 px-3" /></div>
              <input name="eligibleDevices" placeholder="دستگاه‌های مجاز با ویرگول (خالی = همه)" className="h-11 w-full rounded-xl border border-slate-200 px-3" dir="ltr" />
              <div className="flex flex-wrap gap-4 text-sm"><span className="font-bold text-slate-600">نوع نصب مجاز:</span><label><input type="checkbox" name="installationTypes" value="account" /> اکانتی</label><label><input type="checkbox" name="installationTypes" value="copy" /> کپی‌خور</label><span className="text-xs text-slate-400">خالی = همه</span></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="combinable" /> قابل ترکیب با تخفیف دیگر</label>
              <div className="grid gap-3 sm:grid-cols-2"><input name="startsAt" type="datetime-local" aria-label="شروع اعتبار" className="h-11 rounded-xl border border-slate-200 px-3" /><input name="endsAt" type="datetime-local" aria-label="پایان اعتبار" className="h-11 rounded-xl border border-slate-200 px-3" /></div>
              <div className="grid gap-3 sm:grid-cols-2"><input name="shippingRegion" placeholder="محدوده ارسال رایگان" className="h-11 rounded-xl border border-slate-200 px-3" /><input name="maxShippingCost" type="number" min="0" placeholder="سقف هزینه ارسال" className="h-11 rounded-xl border border-slate-200 px-3" /></div>
              <button className="h-11 w-full rounded-xl bg-[#001A6E] font-bold text-white">ساخت قانون غیرفعال</button>
            </div>
          </form>
          <div className="space-y-3">
            {rules.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">قانونی تعریف نشده است.</div> : rules.map((rule) => {
              const reward = rule.reward as Record<string, unknown>;
              return <article key={String(rule._id)} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{String(rule.title)}</h3><p className="mt-1 text-xs text-slate-500">{Number(rule.requiredVisits).toLocaleString("fa-IR")} مراجعه · {String(rule.recurrence) === "repeat" ? "تکرارشونده" : "یک‌باره"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.isActive ? "فعال" : "غیرفعال"}</span></div><p className="mt-3 text-sm text-slate-600">نوع: {String(reward.type)} · مقدار: {Number(reward.value || 0).toLocaleString("fa-IR")}</p><button type="button" onClick={() => void toggleRule(rule)} className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{rule.isActive ? "غیرفعال‌کردن" : "فعال‌کردن پس از بازبینی"}</button></article>;
            })}
          </div>
        </section>
      )}
    </main>
  );
}
