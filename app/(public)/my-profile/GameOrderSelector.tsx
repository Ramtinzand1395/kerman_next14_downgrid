"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gamepad2,
  Loader2,
  MapPin,
  MonitorCog,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";

type ServiceType = "game_install" | "repair";
type Step = 1 | 2 | 3;
type Slot = { startsAt: string; endsAt: string; time: string; remaining: number; available: boolean };
type Reward = {
  _id: string;
  status: "available" | "reserved" | "redeemed" | "expired" | "revoked";
  expiresAt: string;
  snapshot: {
    title: string;
    eligibleServices: ServiceType[];
    reward: {
      type: "fixed" | "percent" | "free_game" | "free_shipping";
      value: number;
      maxDiscountAmount?: number | null;
      minAmount?: number;
      eligibleDevices?: string[];
      eligibleInstallationTypes?: string[];
    };
  };
};
type CreatedAppointment = { trackingCode: string; startsAt: string };

const services = [
  {
    value: "game_install" as const,
    title: "نصب بازی",
    description: "رزرو مراجعه برای نصب بازی اکانتی یا کپی‌خور",
    icon: Gamepad2,
  },
  {
    value: "repair" as const,
    title: "تعمیرات",
    description: "تحویل دستگاه و بررسی اولیه؛ زمان پایان پس از عیب‌یابی اعلام می‌شود",
    icon: Wrench,
  },
];

const devices = [
  { value: "ps5", label: "PlayStation 5" },
  { value: "ps4", label: "PlayStation 4" },
  { value: "xbox-series", label: "Xbox Series" },
  { value: "xbox-one", label: "Xbox One" },
];

const issues = [
  { value: "power", label: "روشن‌نشدن" },
  { value: "display", label: "مشکل تصویر" },
  { value: "controller", label: "دسته" },
  { value: "sound", label: "صدا" },
  { value: "overheating", label: "داغ‌شدن" },
  { value: "other", label: "سایر" },
];

const storeAddress = "خیابان ناصریه بین کوچه ۲ و ۴ نبش داروخانه مادر";
const fa = (value: number | string) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

function persianDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    ...options,
  }).format(new Date(value));
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function choiceClass(active: boolean) {
  return `rounded-2xl border p-4 text-right outline-none transition focus-visible:ring-4 focus-visible:ring-blue-200 ${
    active
      ? "border-[#001A6E] bg-blue-50 text-[#001A6E] shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
  }`;
}

function rewardLabel(reward: Reward) {
  const details = reward.snapshot.reward;
  if (details.type === "free_game") return "یک نصب بازی واجد شرایط رایگان";
  if (details.type === "free_shipping") return "ارسال رایگان";
  if (details.type === "percent") {
    return `${fa(details.value)}٪ تخفیف${details.maxDiscountAmount ? ` تا سقف ${fa(details.maxDiscountAmount.toLocaleString("fa-IR"))} تومان` : ""}`;
  }
  return `${fa(details.value.toLocaleString("fa-IR"))} تومان تخفیف`;
}

export default function GameOrderSelector() {
  const reduceMotion = useReducedMotion();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<Step>(1);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [device, setDevice] = useState("");
  const [installationType, setInstallationType] = useState<"account" | "copy" | "">("");
  const [repairIssue, setRepairIssue] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [availabilityReload, setAvailabilityReload] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAppointment | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const dates = useMemo(
    () =>
      Array.from({ length: 21 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return { key: dateKey(date), date };
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/profile/account", { cache: "no-store" }),
      fetch("/api/profile/visit-rewards", { cache: "no-store" }),
    ])
      .then(async ([profileResponse, rewardsResponse]) => {
        if (!active) return;
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setCustomerName(profile.username || "");
          setPhone(profile.mobile || "");
        }
        if (rewardsResponse.ok) {
          const payload = await rewardsResponse.json();
          setRewards(Array.isArray(payload?.data?.rewards) ? payload.data.rewards : []);
        }
      })
      .finally(() => active && setProfileLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    setSelectedRewardId("");
  }, [serviceType, device]);

  useEffect(() => {
    setSelectedSlot(null);
    if (!serviceType || !selectedDate) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setSlotsLoading(true);
    setSlotsError("");
    fetch(
      `/api/profile/appointments/availability?serviceType=${serviceType}&date=${selectedDate}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "دریافت ساعت‌ها انجام نشد.");
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setSlotsError("ساعت‌های آزاد دریافت نشد. دوباره تلاش کنید.");
        }
      })
      .finally(() => setSlotsLoading(false));
    return () => controller.abort();
  }, [availabilityReload, serviceType, selectedDate]);

  const usableRewards = useMemo(
    () =>
      rewards.filter((reward) => {
        if (reward.status !== "available" || !serviceType) return false;
        if (!reward.snapshot.eligibleServices.includes(serviceType)) return false;
        const details = reward.snapshot.reward;
        if (details.type === "free_shipping") return true;
        if (details.eligibleDevices?.length && !details.eligibleDevices.includes(device)) return false;
        if (
          details.eligibleInstallationTypes?.length &&
          (!installationType || !details.eligibleInstallationTypes.includes(installationType))
        ) return false;
        return true;
      }),
    [device, installationType, rewards, serviceType],
  );

  const stageOneValid =
    Boolean(serviceType && device) &&
    (serviceType === "game_install" ? Boolean(installationType) : Boolean(repairIssue));
  const stageThreeValid = customerName.trim().length >= 2 && /^09\d{9}$/.test(phone.trim());
  const selectedService = services.find((item) => item.value === serviceType);

  const submit = async () => {
    if (submittingRef.current || !serviceType || !selectedSlot || !stageThreeValid) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    const key = idempotencyKey || crypto.randomUUID();
    if (!idempotencyKey) setIdempotencyKey(key);
    try {
      const response = await fetch("/api/profile/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          clientRequestKey: key,
          serviceType,
          device,
          installationType: serviceType === "game_install" ? installationType : null,
          repairIssue: serviceType === "repair" ? repairIssue : null,
          description,
          customerName: customerName.trim(),
          phone: phone.trim(),
          startsAt: selectedSlot.startsAt,
          selectedRewardId: selectedRewardId || null,
          fulfillment: "in_store",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "ثبت نوبت انجام نشد.");
      setCreated(payload.appointment as CreatedAppointment);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ثبت نوبت انجام نشد.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-gradient-to-l from-emerald-600 to-teal-500 px-5 py-8 text-center text-white md:px-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Check className="h-9 w-9" />
          </span>
          <h1 className="mt-4 text-2xl font-black">نوبت شما ثبت شد</h1>
          <p className="mt-2 text-emerald-50">این کد را برای پیگیری نگه دارید</p>
          <p className="mt-4 font-mono text-2xl font-black tracking-wider" dir="ltr">
            {created.trackingCode}
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-8">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">زمان مراجعه</p>
            <p className="mt-2 font-bold text-slate-900">
              {persianDate(created.startsAt, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">آدرس فروشگاه</p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-900">{storeAddress}</p>
          </div>
          <Link href="/my-profile?step=5" className="md:col-span-2 flex min-h-12 items-center justify-center rounded-2xl bg-[#001A6E] px-5 font-bold text-white">
            مشاهده نوبت‌های من
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="relative pb-24 lg:pb-0">
      <div className="mb-5 overflow-hidden rounded-3xl bg-[#001A6E] p-5 text-white shadow-xl shadow-blue-950/10 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-200">رزرو حضوری کرمان آتاری</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">دریافت نوبت</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">
              در سه مرحله کوتاه، زمان مراجعه برای نصب بازی یا پذیرش اولیه تعمیرات را انتخاب کنید.
            </p>
          </div>
          <span className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-bold">منطقه زمانی تهران</span>
        </div>
        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="مراحل ثبت نوبت">
          {["خدمت و دستگاه", "روز و ساعت", "تأیید و ثبت"].map((label, index) => {
            const number = (index + 1) as Step;
            return (
              <li key={label} className="min-w-0">
                <div className={`h-1 rounded-full ${step >= number ? "bg-cyan-300" : "bg-white/20"}`} />
                <p className={`mt-2 truncate text-[11px] sm:text-xs ${step === number ? "font-black text-white" : "text-blue-200"}`}>
                  {fa(number)}. {label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 14 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && (
                <div className="space-y-7">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">چه خدمتی نیاز دارید؟</h2>
                    <p className="mt-1 text-sm text-slate-500">هر زمان انتخاب را عوض کنید، زمان وابسته پاک می‌شود.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {services.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.value} type="button" aria-pressed={serviceType === item.value} onClick={() => setServiceType(item.value)} className={choiceClass(serviceType === item.value)}>
                            <Icon className="h-7 w-7" />
                            <strong className="mt-3 block">{item.title}</strong>
                            <span className="mt-1 block text-xs leading-6 text-slate-500">{item.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {serviceType && (
                    <div>
                      <h3 className="font-black text-slate-900">دستگاه</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {devices.map((item) => (
                          <button key={item.value} type="button" aria-pressed={device === item.value} onClick={() => setDevice(item.value)} className={choiceClass(device === item.value)}>
                            <MonitorCog className="h-5 w-5" />
                            <span className="mt-2 block text-sm font-bold">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {serviceType === "game_install" && device && (
                    <fieldset>
                      <legend className="font-black text-slate-900">نوع نصب</legend>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button type="button" aria-pressed={installationType === "account"} onClick={() => setInstallationType("account")} className={choiceClass(installationType === "account")}>
                          <strong>اکانتی / قانونی</strong>
                          <span className="mt-1 block text-xs text-slate-500">هزینه اکانت جداگانه و پس از بررسی مشخص می‌شود.</span>
                        </button>
                        <button type="button" aria-pressed={installationType === "copy"} onClick={() => setInstallationType("copy")} className={choiceClass(installationType === "copy")}>
                          <strong>کپی‌خور</strong>
                          <span className="mt-1 block text-xs text-slate-500">فقط برای دستگاه و شرایط فنی واجد شرایط.</span>
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {serviceType === "repair" && device && (
                    <fieldset>
                      <legend className="font-black text-slate-900">مشکل دستگاه</legend>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {issues.map((item) => (
                          <button key={item.value} type="button" aria-pressed={repairIssue === item.value} onClick={() => setRepairIssue(item.value)} className={choiceClass(repairIssue === item.value)}>
                            <span className="text-sm font-bold">{item.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                        این نوبت فقط برای تحویل و بررسی اولیه است؛ قیمت و زمان پایان تعمیر پس از عیب‌یابی اعلام می‌شود.
                      </p>
                    </fieldset>
                  )}

                  {serviceType && device && (
                    <label className="block text-sm font-bold text-slate-700">
                      توضیحات {serviceType === "repair" && repairIssue === "other" ? "(برای گزینه سایر ضروری)" : "(اختیاری)"}
                      <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="اطلاعاتی که به پذیرش بهتر کمک می‌کند…" className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    </label>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-xl font-black text-slate-950">روز و ساعت مراجعه</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-500">ساعت کاری: ۹ تا ۱۲ و ۱۶ تا ۲۰. بازه ظهر قابل رزرو نیست.</p>
                  <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="انتخاب روز">
                    {dates.map((item) => (
                      <button key={item.key} type="button" onClick={() => setSelectedDate(item.key)} aria-pressed={selectedDate === item.key} className={`min-w-28 rounded-2xl border px-3 py-3 text-center outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${selectedDate === item.key ? "border-[#001A6E] bg-[#001A6E] text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                        <span className="block text-xs">{persianDate(item.date, { weekday: "long" })}</span>
                        <strong className="mt-1 block text-sm">{persianDate(item.date, { month: "short", day: "numeric" })}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 min-h-36">
                    {!selectedDate ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">ابتدا روز مراجعه را انتخاب کنید.</div>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت ظرفیت واقعی…</div>
                    ) : slotsError ? (
                      <button type="button" onClick={() => setAvailabilityReload((value) => value + 1)} className="mx-auto flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"><RefreshCw className="h-4 w-4" /> تلاش دوباره</button>
                    ) : slots.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-7 text-center text-sm text-slate-500">برای این روز ساعت آزادی وجود ندارد؛ روز دیگری را انتخاب کنید.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {slots.map((slot) => (
                          <button key={slot.startsAt} type="button" disabled={!slot.available} onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot?.startsAt === slot.startsAt} className={`rounded-2xl border px-3 py-3 text-center outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${selectedSlot?.startsAt === slot.startsAt ? "border-[#001A6E] bg-blue-50 text-[#001A6E]" : "border-slate-200"}`}>
                            <strong className="block text-base">{fa(slot.time)}</strong>
                            <span className="mt-1 block text-[11px]">{slot.available ? `${fa(slot.remaining)} ظرفیت باقی‌مانده` : "تکمیل ظرفیت"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">تأیید اطلاعات</h2>
                    <p className="mt-1 text-sm text-slate-500">فقط اطلاعات ضروری ناقص را تکمیل کنید.</p>
                  </div>
                  {profileLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت پروفایل…</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-bold text-slate-700">نام و نام خانوادگی<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                      <label className="text-sm font-bold text-slate-700">شماره موبایل<input dir="ltr" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-left font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                    </div>
                  )}
                  <div>
                    <h3 className="flex items-center gap-2 font-black text-slate-900"><Sparkles className="h-5 w-5 text-amber-500" /> پاداش‌های قابل استفاده</h3>
                    {usableRewards.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">در حال حاضر پاداش قابل استفاده‌ای برای این خدمت ندارید.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <button type="button" onClick={() => setSelectedRewardId("")} className={`w-full ${choiceClass(!selectedRewardId)}`}>بدون استفاده از پاداش</button>
                        {usableRewards.map((reward) => {
                          const shipping = reward.snapshot.reward.type === "free_shipping";
                          return (
                            <button key={reward._id} type="button" disabled={shipping} onClick={() => setSelectedRewardId(reward._id)} className={`w-full ${choiceClass(selectedRewardId === reward._id)} disabled:cursor-not-allowed disabled:opacity-60`}>
                              <strong>{reward.snapshot.title}</strong>
                              <span className="mt-1 block text-xs text-slate-500">{rewardLabel(reward)}</span>
                              {shipping && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">با فعال‌شدن پیک قابل مصرف است</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-black text-[#001A6E]"><MapPin className="h-4 w-4" /> مراجعه حضوری</p>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{storeAddress}</p>
                    </div>
                    <div aria-disabled="true" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-70">
                      <p className="flex items-center gap-2 text-sm font-black text-slate-600"><Truck className="h-4 w-4" /> ارسال با پیک</p>
                      <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">به‌زودی</span>
                    </div>
                  </div>
                  {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 hidden items-center justify-between border-t border-slate-100 pt-5 lg:flex">
            <button type="button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1) as Step)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-5 font-bold text-slate-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /> قبل</button>
            {step < 3 ? (
              <button type="button" disabled={step === 1 ? !stageOneValid || (repairIssue === "other" && !description.trim()) : !selectedSlot} onClick={() => setStep((value) => Math.min(3, value + 1) as Step)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#001A6E] px-7 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">ادامه <ChevronLeft className="h-4 w-4" /></button>
            ) : (
              <button type="button" disabled={!stageThreeValid || submitting} onClick={() => void submit()} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#001A6E] px-7 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} ثبت نوبت</button>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-black text-slate-900"><PackageOpen className="h-5 w-5 text-[#001A6E]" /> خلاصه نوبت</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">خدمت</dt><dd className="font-bold">{selectedService?.title || "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">دستگاه</dt><dd className="font-bold">{devices.find((item) => item.value === device)?.label || "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">روز</dt><dd className="text-left font-bold">{selectedSlot ? persianDate(selectedSlot.startsAt, { weekday: "long", month: "long", day: "numeric" }) : "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">ساعت</dt><dd className="font-bold">{selectedSlot ? fa(selectedSlot.time) : "انتخاب نشده"}</dd></div>
          </dl>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            <Clock3 className="mb-2 h-5 w-5" />
            هزینه خدمت پس از بررسی مشخص می‌شود؛ مبلغ صفر به‌عنوان قیمت قطعی ثبت نمی‌شود.
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            <CalendarDays className="mb-2 h-5 w-5 text-[#001A6E]" />
            نوبت تعمیرات، زمان تحویل و بررسی اولیه دستگاه است و وعده پایان تعمیر نیست.
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-screen-md items-center gap-2">
          <button type="button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1) as Step)} aria-label="مرحله قبل" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
          {step < 3 ? (
            <button type="button" disabled={step === 1 ? !stageOneValid || (repairIssue === "other" && !description.trim()) : !selectedSlot} onClick={() => setStep((value) => Math.min(3, value + 1) as Step)} className="h-12 flex-1 rounded-2xl bg-[#001A6E] font-black text-white disabled:bg-slate-300">ادامه</button>
          ) : (
            <button type="button" disabled={!stageThreeValid || submitting} onClick={() => void submit()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#001A6E] font-black text-white disabled:bg-slate-300">{submitting && <Loader2 className="h-5 w-5 animate-spin" />} ثبت نوبت</button>
          )}
        </div>
      </div>
    </section>
  );
}
