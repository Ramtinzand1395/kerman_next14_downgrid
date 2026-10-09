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
import type {
  Fulfillment,
  InstallationType,
  RepairIssue,
  RewardType,
  ServiceType,
} from "@/types/appointments";

type Step = 1 | 2 | 3 | 4;
type Slot = { startsAt: string; endsAt: string; time: string; remaining: number; available: boolean };
type CourierWindow = { start: string; end: string; remaining: number; available: boolean };
type AddressItem = { _id: string; province: string; city: string; address: string; plaque?: string; unit?: string; postalCode?: string };
type CourierPreview = {
  eligible: boolean;
  courierEnabled: boolean;
  reason?: "COURIER_DISABLED" | "OUT_OF_REGION";
  region?: { id: string; title: string; city: string };
  pricing?: {
    pickupShippingCost: number;
    returnShippingCost: number;
    shippingBaseAmount: number;
    shippingDiscountAmount: number;
    shippingFinalAmount: number;
  };
  reward?: { applicable: boolean; type: string };
};
type Reward = {
  _id: string;
  status: "available" | "reserved" | "redeemed" | "expired" | "revoked";
  expiresAt: string;
  snapshot: {
    title: string;
    eligibleServices: ServiceType[];
    reward: {
      type: RewardType;
      value: number;
      maxDiscountAmount?: number | null;
      minAmount?: number;
      eligibleDevices?: string[];
      eligibleInstallationTypes?: string[];
    };
  };
};
type CreatedAppointment = {
  trackingCode: string;
  startsAt: string;
  fulfillment?: Fulfillment;
  courier?: {
    pickupWindow?: { start: string; end: string };
    addressSnapshot?: AddressItem & { recipientName?: string; recipientPhone?: string };
  };
  pricing?: {
    shippingBaseAmount?: number;
    shippingDiscountAmount?: number;
    shippingFinalAmount?: number;
  };
};

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

const deviceLabels: Record<string, string> = {
  ps5: "PlayStation 5",
  ps4: "PlayStation 4",
  "xbox-series": "Xbox Series",
  "xbox-one": "Xbox One",
};

const issues = [
  { value: "power", label: "روشن‌نشدن" },
  { value: "display", label: "مشکل تصویر" },
  { value: "controller", label: "دسته" },
  { value: "sound", label: "صدا" },
  { value: "overheating", label: "داغ‌شدن" },
  { value: "other", label: "سایر" },
] satisfies Array<{ value: RepairIssue; label: string }>;

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

function toman(value: number) {
  return value === 0 ? "رایگان" : `${value.toLocaleString("fa-IR")} تومان`;
}

function discountToman(value: number) {
  return value === 0 ? "بدون تخفیف" : `${value.toLocaleString("fa-IR")} تومان`;
}

export default function GameOrderSelector({
  initialFulfillment = null,
}: {
  initialFulfillment?: Fulfillment | null;
}) {
  const reduceMotion = useReducedMotion();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<Step>(1);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [device, setDevice] = useState("");
  const [installationType, setInstallationType] = useState<InstallationType | "">("");
  const [repairIssue, setRepairIssue] = useState<RepairIssue | "">("");
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(initialFulfillment);
  const [supportedDeviceIds, setSupportedDeviceIds] = useState<string[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [courierSupported, setCourierSupported] = useState(false);
  const [courierBookingDays, setCourierBookingDays] = useState(14);
  const [courierWindows, setCourierWindows] = useState<CourierWindow[]>([]);
  const [selectedCourierWindow, setSelectedCourierWindow] = useState<CourierWindow | null>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierError, setCourierError] = useState("");
  const [courierPreview, setCourierPreview] = useState<CourierPreview | null>(null);
  const [courierPreviewLoading, setCourierPreviewLoading] = useState(false);
  const [courierPreviewError, setCourierPreviewError] = useState("");
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
      fetch("/api/profile/address", { cache: "no-store" }),
      fetch(`/api/profile/appointments/courier-availability?date=${dates[0]?.key}`, { cache: "no-store" }),
    ])
      .then(async ([profileResponse, rewardsResponse, addressesResponse, courierResponse]) => {
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
        if (addressesResponse.ok) {
          const payload = await addressesResponse.json();
          setAddresses(Array.isArray(payload) ? payload : []);
        }
        if (courierResponse.ok) {
          const payload = await courierResponse.json();
          const enabled = Boolean(payload?.settings?.courierEnabled);
          setCourierSupported(enabled);
          if (!enabled) setFulfillment((current) => current === "courier" ? null : current);
          setCourierBookingDays(Number(payload?.settings?.bookingDaysAhead) || 14);
        }
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
          setAddressesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [dates]);

  useEffect(() => {
    setDevice("");
    setSupportedDeviceIds([]);
    setDevicesError("");
    if (!serviceType) return;
    const controller = new AbortController();
    setDevicesLoading(true);
    const firstDate = dates[0]?.key;
    fetch(
      `/api/profile/appointments/availability?serviceType=${serviceType}&date=${firstDate}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "دریافت دستگاه‌ها انجام نشد.");
        const ids = Array.isArray(payload?.settings?.supportedDevices)
          ? payload.settings.supportedDevices.filter((item: unknown): item is string => typeof item === "string")
          : [];
        setSupportedDeviceIds(ids);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setDevicesError("فهرست دستگاه‌های قابل پذیرش دریافت نشد.");
        }
      })
      .finally(() => setDevicesLoading(false));
    return () => controller.abort();
  }, [dates, serviceType]);

  useEffect(() => {
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    setSelectedRewardId("");
    setSelectedAddressId("");
    setSelectedCourierWindow(null);
  }, [serviceType, device]);

  useEffect(() => {
    setSelectedSlot(null);
    if (fulfillment !== "in_store" || !serviceType || !selectedDate) {
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
  }, [availabilityReload, fulfillment, serviceType, selectedDate]);

  useEffect(() => {
    setSelectedCourierWindow(null);
    if (fulfillment !== "courier" || !selectedDate) {
      setCourierWindows([]);
      return;
    }
    const controller = new AbortController();
    setCourierLoading(true);
    setCourierError("");
    fetch(`/api/profile/appointments/courier-availability?date=${selectedDate}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "دریافت بازه‌های پیک انجام نشد.");
        const enabled = Boolean(payload?.settings?.courierEnabled);
        setCourierSupported(enabled);
        if (!enabled) setFulfillment((current) => current === "courier" ? null : current);
        setCourierBookingDays(Number(payload?.settings?.bookingDaysAhead) || 14);
        setCourierWindows(Array.isArray(payload?.windows) ? payload.windows : []);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setCourierError(reason.message);
      })
      .finally(() => setCourierLoading(false));
    return () => controller.abort();
  }, [fulfillment, selectedDate]);

  useEffect(() => {
    setCourierPreview(null);
    setCourierPreviewError("");
    setCourierPreviewLoading(false);
    if (fulfillment !== "courier" || !selectedAddressId || !serviceType) return;

    const controller = new AbortController();
    setCourierPreviewLoading(true);
    fetch("/api/profile/appointments/courier-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId: selectedAddressId,
        serviceType,
        device,
        selectedRewardId: selectedRewardId || null,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "محاسبه هزینه پیک انجام نشد.");
        setCourierPreview(payload as CourierPreview);
        const enabled = Boolean(payload.courierEnabled);
        setCourierSupported(enabled);
        if (!enabled) setFulfillment((current) => current === "courier" ? null : current);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setCourierPreviewError(reason.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCourierPreviewLoading(false);
      });

    return () => controller.abort();
  }, [device, fulfillment, selectedAddressId, selectedRewardId, serviceType]);

  const usableRewards = useMemo(
    () =>
      rewards.filter((reward) => {
        if (reward.status !== "available" || !serviceType) return false;
        if (!reward.snapshot.eligibleServices.includes(serviceType)) return false;
        const details = reward.snapshot.reward;
        if (details.type === "free_shipping") return fulfillment === "courier";
        if (details.eligibleDevices?.length && !details.eligibleDevices.includes(device)) return false;
        if (
          details.eligibleInstallationTypes?.length &&
          (!installationType || !details.eligibleInstallationTypes.includes(installationType))
        ) return false;
        return true;
      }),
    [device, fulfillment, installationType, rewards, serviceType],
  );

  useEffect(() => {
    if (selectedRewardId && !usableRewards.some((reward) => reward._id === selectedRewardId)) {
      setSelectedRewardId("");
    }
  }, [selectedRewardId, usableRewards]);

  const selectedAddress = addresses.find((item) => item._id === selectedAddressId);

  const stageOneValid =
    Boolean(serviceType && device) &&
    (serviceType === "game_install" ? Boolean(installationType) : Boolean(repairIssue));
  const stageThreeValid = customerName.trim().length >= 2 && /^09\d{9}$/.test(phone.trim());
  const scheduleValid = fulfillment === "in_store"
    ? Boolean(selectedSlot)
    : fulfillment === "courier"
      ? Boolean(selectedAddress && courierPreview?.eligible && selectedDate && selectedCourierWindow)
      : false;
  const selectedService = services.find((item) => item.value === serviceType);

  const submit = async () => {
    if (submittingRef.current || !serviceType || !fulfillment || !scheduleValid || !stageThreeValid) return;
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
          selectedRewardId: selectedRewardId || null,
          fulfillment,
          ...(fulfillment === "in_store" && selectedSlot
            ? { startsAt: selectedSlot.startsAt }
            : fulfillment === "courier" && selectedCourierWindow
              ? {
                  addressId: selectedAddressId,
                  pickupDate: selectedDate,
                  pickupWindow: {
                    start: selectedCourierWindow.start,
                    end: selectedCourierWindow.end,
                  },
                }
              : {}),
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
          <h1 className="mt-4 text-2xl font-black">{created.fulfillment === "courier" ? "درخواست پیک شما ثبت شد" : "نوبت شما ثبت شد"}</h1>
          <p className="mt-2 text-emerald-50">این کد را برای پیگیری نگه دارید</p>
          <p className="mt-4 font-mono text-2xl font-black tracking-wider" dir="ltr">
            {created.trackingCode}
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-8">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{created.fulfillment === "courier" ? "زمان دریافت دستگاه" : "زمان مراجعه"}</p>
            <p className="mt-2 font-bold text-slate-900">
              {persianDate(created.startsAt, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {created.fulfillment === "courier" ? (
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">هزینه پیک</p><p className="mt-2 font-bold text-slate-900">{created.pricing?.shippingFinalAmount !== undefined ? `${created.pricing.shippingFinalAmount.toLocaleString("fa-IR")} تومان` : "در پاسخ Server اعلام نشد"}</p><p className="mt-1 text-xs text-slate-500">مبلغ خدمت پس از بررسی مشخص می‌شود.</p></div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">آدرس فروشگاه</p><p className="mt-2 text-sm font-bold leading-7 text-slate-900">{storeAddress}</p></div>
          )}
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
            <p className="text-sm font-bold text-blue-200">دریافت خدمات کرمان آتاری</p>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">دریافت نوبت</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">
              خدمت، دستگاه و روش دریافت را انتخاب کنید؛ ظرفیت‌ها مستقیماً از سامانه خوانده می‌شوند.
            </p>
          </div>
          <span className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-bold">منطقه زمانی تهران</span>
        </div>
        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="مراحل ثبت نوبت">
          {["خدمت و دستگاه", "روش دریافت", "روز و ساعت", "تأیید و ثبت"].map((label, index) => {
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
                    {devicesLoading ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="در حال دریافت دستگاه‌ها">
                        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
                      </div>
                    ) : devicesError ? (
                      <div role="alert" className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{devicesError}</div>
                    ) : supportedDeviceIds.length === 0 ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">دستگاهی برای این خدمت اعلام نشده است.</div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {supportedDeviceIds.map((item) => (
                          <button key={item} type="button" aria-pressed={device === item} onClick={() => setDevice(item)} className={choiceClass(device === item)}>
                            <MonitorCog className="h-5 w-5" />
                            <span className="mt-2 block text-sm font-bold">{deviceLabels[item] || item}</span>
                          </button>
                        ))}
                      </div>
                    )}
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
                  <h2 className="text-xl font-black text-slate-950">چگونه می‌خواهید خدمات بگیرید؟</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-500">روش دریافت، زمان‌بندی و مراحل بعدی را مشخص می‌کند.</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <button type="button" aria-pressed={fulfillment === "in_store"} onClick={() => setFulfillment("in_store")} className={choiceClass(fulfillment === "in_store")}>
                      <MapPin className="h-7 w-7" />
                      <strong className="mt-3 block text-base">مراجعه حضوری</strong>
                      <span className="mt-2 block text-xs leading-6 text-slate-500">زمان مراجعه را رزرو کنید و دستگاه را حضوری به فروشگاه بیاورید.</span>
                    </button>
                    <button type="button" disabled={!courierSupported} aria-disabled={!courierSupported} aria-pressed={fulfillment === "courier"} onClick={() => setFulfillment("courier")} className={`${choiceClass(fulfillment === "courier")} ${!courierSupported ? "cursor-not-allowed opacity-65" : ""}`}>
                      <Truck className="h-7 w-7" />
                      <span className="mt-3 flex items-center justify-between gap-2">
                        <strong className="text-base">ارسال با پیک</strong>
                        {!courierSupported && <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">فعلاً در دسترس نیست</span>}
                      </span>
                      <span className="mt-2 block text-xs leading-6 text-slate-500">پیک دستگاه را از آدرس شما دریافت می‌کند و پس از انجام کار بازمی‌گرداند.</span>
                    </button>
                  </div>
                  {!courierSupported && (
                    <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                      در حال حاضر ارسال با پیک از سمت سامانه غیرفعال است.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-xl font-black text-slate-950">{fulfillment === "courier" ? "آدرس و زمان دریافت دستگاه" : "روز و ساعت مراجعه"}</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-500">{fulfillment === "courier" ? "آدرس، روز و بازه دریافت پیک را انتخاب کنید." : "روز و ساعت آزاد را از ظرفیت واقعی فروشگاه انتخاب کنید."}</p>
                  {fulfillment === "courier" && (
                    <div className="mt-5">
                      <h3 className="font-black text-slate-900">آدرس دریافت</h3>
                      {addressesLoading ? <div className="mt-3 h-24 animate-pulse rounded-2xl bg-slate-100" /> : addresses.length === 0 ? (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600"><p>برای استفاده از پیک ابتدا یک آدرس ثبت کنید.</p><Link href="/my-profile?step=2" className="mt-3 inline-flex rounded-xl bg-[#001A6E] px-4 py-2 font-bold text-white">افزودن آدرس</Link></div>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {addresses.map((address) => {
                            const selected = selectedAddressId === address._id;
                            const eligible = selected && courierPreview?.eligible;
                            const rejected = selected && courierPreview && !courierPreview.eligible;
                            return <button key={address._id} type="button" onClick={() => setSelectedAddressId(address._id)} aria-pressed={selected} className={choiceClass(selected)}><strong className="block">{address.city}</strong><span className="mt-1 block text-xs leading-6 text-slate-500">{address.address}{address.plaque ? `، پلاک ${address.plaque}` : ""}</span><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${eligible ? "bg-emerald-100 text-emerald-700" : rejected ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{selected && courierPreviewLoading ? "در حال بررسی سرور…" : eligible ? "محدوده تأیید شد" : rejected ? "خارج از محدوده" : "انتخاب برای بررسی"}</span></button>;
                          })}
                        </div>
                      )}
                      {selectedAddress && courierPreviewLoading && <p aria-live="polite" className="mt-3 flex items-center gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><Loader2 className="h-4 w-4 animate-spin" /> در حال بررسی محدوده و محاسبه هزینه توسط سرور…</p>}
                      {selectedAddress && courierPreviewError && <p role="alert" className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{courierPreviewError}</p>}
                      {selectedAddress && courierPreview && !courierPreview.eligible && <p role="alert" className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{courierPreview.reason === "COURIER_DISABLED" ? "سرویس پیک در حال حاضر غیرفعال است." : "این آدرس خارج از محدوده فعال پیک است. آدرس دیگری یا مراجعه حضوری را انتخاب کنید."}</p>}
                      {selectedAddress && courierPreview?.eligible && courierPreview.pricing && (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong>محدوده «{courierPreview.region?.title || courierPreview.region?.city}» تأیید شد</strong>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">واجد شرایط پیک</span>
                          </div>
                          <dl className="mt-4 grid gap-2 border-t border-emerald-200 pt-3 sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-3"><dt>هزینه رفت</dt><dd className="font-black">{toman(courierPreview.pricing.pickupShippingCost)}</dd></div>
                            <div className="flex items-center justify-between gap-3"><dt>هزینه برگشت</dt><dd className="font-black">{toman(courierPreview.pricing.returnShippingCost)}</dd></div>
                            <div className="flex items-center justify-between gap-3"><dt>جمع ارسال</dt><dd className="font-black">{toman(courierPreview.pricing.shippingBaseAmount)}</dd></div>
                            <div className="flex items-center justify-between gap-3"><dt>تخفیف ارسال</dt><dd className="font-black text-emerald-700">{discountToman(courierPreview.pricing.shippingDiscountAmount)}</dd></div>
                            <div className="flex items-center justify-between gap-3 border-t border-emerald-200 pt-2 sm:col-span-2"><dt className="font-black">هزینه نهایی پیک</dt><dd className="text-base font-black">{toman(courierPreview.pricing.shippingFinalAmount)}</dd></div>
                          </dl>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="انتخاب روز">
                    {dates.map((item, index) => (
                      <button key={item.key} type="button" disabled={fulfillment === "courier" && index >= courierBookingDays} onClick={() => setSelectedDate(item.key)} aria-pressed={selectedDate === item.key} className={`min-w-28 rounded-2xl border px-3 py-3 text-center outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-40 ${selectedDate === item.key ? "border-[#001A6E] bg-[#001A6E] text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                        <span className="block text-xs">{persianDate(item.date, { weekday: "long" })}</span>
                        <strong className="mt-1 block text-sm">{persianDate(item.date, { month: "short", day: "numeric" })}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 min-h-36">
                    {!selectedDate ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">ابتدا روز را انتخاب کنید.</div>
                    ) : fulfillment === "courier" ? (
                      courierLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت ظرفیت پیک…</div> : courierError ? <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{courierError}</div> : courierWindows.length === 0 ? <div className="rounded-2xl bg-slate-50 p-7 text-center text-sm text-slate-500">برای این روز بازه پیک فعالی وجود ندارد.</div> : <div className="grid gap-2 sm:grid-cols-2">{courierWindows.map((window) => <button key={`${window.start}-${window.end}`} type="button" disabled={!window.available} onClick={() => setSelectedCourierWindow(window)} aria-pressed={selectedCourierWindow?.start === window.start} className={`rounded-2xl border p-4 text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${selectedCourierWindow?.start === window.start ? "border-[#001A6E] bg-blue-50 text-[#001A6E]" : "border-slate-200"}`}><strong className="block">{fa(window.start)} تا {fa(window.end)}</strong><span className="mt-1 block text-xs">{window.available ? `${fa(window.remaining)} ظرفیت باقی‌مانده` : "تکمیل ظرفیت"}</span></button>)}</div>
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

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">خلاصه و ثبت درخواست</h2>
                    <p className="mt-1 text-sm text-slate-500">اطلاعات تماس را بررسی کنید و سپس درخواست را ثبت کنید.</p>
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
                            <button key={reward._id} type="button" onClick={() => setSelectedRewardId(reward._id)} className={`w-full ${choiceClass(selectedRewardId === reward._id)}`}>
                              <strong>{reward.snapshot.title}</strong>
                              <span className="mt-1 block text-xs text-slate-500">{rewardLabel(reward)}</span>
                              {shipping && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">مخصوص سفارش پیکی</span>}
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
                    <div className={`rounded-2xl border p-4 ${fulfillment === "courier" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="flex items-center gap-2 text-sm font-black text-slate-700"><Truck className="h-4 w-4" /> ارسال با پیک</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${fulfillment === "courier" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{fulfillment === "courier" ? "انتخاب‌شده" : courierSupported ? "در دسترس" : "فعلاً غیرفعال"}</span>
                    </div>
                  </div>
                  {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 hidden items-center justify-between border-t border-slate-100 pt-5 lg:flex">
            <button type="button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1) as Step)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-5 font-bold text-slate-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /> قبل</button>
            {step < 4 ? (
              <button type="button" disabled={step === 1 ? !stageOneValid || (repairIssue === "other" && !description.trim()) : step === 2 ? !fulfillment : !scheduleValid} onClick={() => setStep((value) => Math.min(4, value + 1) as Step)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#001A6E] px-7 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">ادامه <ChevronLeft className="h-4 w-4" /></button>
            ) : (
              <button type="button" disabled={!stageThreeValid || !scheduleValid || submitting} onClick={() => void submit()} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#001A6E] px-7 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} ثبت نوبت</button>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-black text-slate-900"><PackageOpen className="h-5 w-5 text-[#001A6E]" /> خلاصه نوبت</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">خدمت</dt><dd className="font-bold">{selectedService?.title || "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">دستگاه</dt><dd className="font-bold">{device ? deviceLabels[device] || device : "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">روش دریافت</dt><dd className="font-bold">{fulfillment === "in_store" ? "مراجعه حضوری" : fulfillment === "courier" ? "ارسال با پیک" : "انتخاب نشده"}</dd></div>
            {fulfillment === "courier" && <div className="flex justify-between gap-3"><dt className="text-slate-500">آدرس</dt><dd className="max-w-44 text-left text-xs font-bold leading-6">{selectedAddress ? `${selectedAddress.city}، ${selectedAddress.address}` : "انتخاب نشده"}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-slate-500">روز</dt><dd className="text-left font-bold">{selectedDate ? persianDate(`${selectedDate}T12:00:00+03:30`, { weekday: "long", month: "long", day: "numeric" }) : "انتخاب نشده"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">ساعت</dt><dd className="font-bold">{fulfillment === "courier" && selectedCourierWindow ? `${fa(selectedCourierWindow.start)} تا ${fa(selectedCourierWindow.end)}` : selectedSlot ? fa(selectedSlot.time) : "انتخاب نشده"}</dd></div>
            {fulfillment === "courier" && courierPreview?.region && <div className="flex justify-between gap-3"><dt className="text-slate-500">منطقه پیک</dt><dd className="text-left text-xs font-bold">{courierPreview.region.title || courierPreview.region.city}</dd></div>}
            {fulfillment === "courier" && courierPreview?.pricing && <>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">هزینه رفت</dt><dd className="text-left text-xs font-bold">{toman(courierPreview.pricing.pickupShippingCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">هزینه برگشت</dt><dd className="text-left text-xs font-bold">{toman(courierPreview.pricing.returnShippingCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">تخفیف ارسال</dt><dd className="text-left text-xs font-bold text-emerald-700">{discountToman(courierPreview.pricing.shippingDiscountAmount)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-3"><dt className="font-black text-slate-700">هزینه نهایی پیک</dt><dd className="text-left text-xs font-black text-[#001A6E]">{toman(courierPreview.pricing.shippingFinalAmount)}</dd></div>
            </>}
            {fulfillment === "courier" && !courierPreview?.pricing && <div className="flex justify-between gap-3"><dt className="text-slate-500">هزینه پیک</dt><dd className="text-left text-xs font-bold">{courierPreviewLoading ? "در حال دریافت از سرور…" : courierPreviewError ? "دریافت نشد" : "پس از انتخاب آدرس"}</dd></div>}
          </dl>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            <Clock3 className="mb-2 h-5 w-5" />
            {fulfillment === "courier" ? "پیش‌نمایش هزینه پیک از سرور دریافت می‌شود و هنگام ثبت دوباره اعتبارسنجی خواهد شد؛ هزینه خود خدمت پس از بررسی مشخص می‌شود." : "هزینه خدمت پس از بررسی مشخص می‌شود؛ مبلغ صفر به‌عنوان قیمت قطعی ثبت نمی‌شود."}
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
          {step < 4 ? (
            <button type="button" disabled={step === 1 ? !stageOneValid || (repairIssue === "other" && !description.trim()) : step === 2 ? !fulfillment : !scheduleValid} onClick={() => setStep((value) => Math.min(4, value + 1) as Step)} className="h-12 flex-1 rounded-2xl bg-[#001A6E] font-black text-white disabled:bg-slate-300">ادامه</button>
          ) : (
            <button type="button" disabled={!stageThreeValid || !scheduleValid || submitting} onClick={() => void submit()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#001A6E] font-black text-white disabled:bg-slate-300">{submitting && <Loader2 className="h-5 w-5 animate-spin" />} ثبت نوبت</button>
          )}
        </div>
      </div>
    </section>
  );
}
