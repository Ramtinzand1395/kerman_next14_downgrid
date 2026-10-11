import type {
  AppointmentItem,
  AppointmentStatus,
  CourierStatus,
  RewardSummary,
} from "@/types/appointments";

export const weekdayOptions = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

export const statusLabel: Record<AppointmentStatus, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

export const statusTone: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-800 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
  no_show: "bg-orange-50 text-orange-800 ring-orange-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
};

export const appointmentTransitions: Partial<
  Record<AppointmentStatus, AppointmentStatus[]>
> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show", "rejected"],
  completed: ["confirmed"],
};

export const courierLabel: Record<CourierStatus, string> = {
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

export const courierTone: Record<CourierStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  scheduled: "bg-blue-50 text-blue-800 ring-blue-200",
  assigned: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  picked_up: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  at_store: "bg-violet-50 text-violet-800 ring-violet-200",
  return_ready: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
  returning: "bg-sky-50 text-sky-800 ring-sky-200",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
};

export const courierNext: Partial<Record<CourierStatus, CourierStatus[]>> = {
  pending: ["scheduled", "cancelled"],
  scheduled: ["assigned", "picked_up", "cancelled"],
  assigned: ["picked_up", "scheduled", "cancelled"],
  picked_up: ["at_store"],
  at_store: ["return_ready"],
  return_ready: ["returning"],
  returning: ["delivered"],
};

export const courierTimeline: CourierStatus[] = [
  "pending",
  "scheduled",
  "assigned",
  "picked_up",
  "at_store",
  "return_ready",
  "returning",
  "delivered",
];

export function toman(value: number | null | undefined) {
  if (value === null || value === undefined) return "نامشخص";
  if (value === 0) return "رایگان";
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

export function discountToman(value: number | null | undefined) {
  if (value === null || value === undefined) return "نامشخص";
  if (value === 0) return "بدون تخفیف";
  return `${Math.round(value).toLocaleString("fa-IR")} تومان`;
}

export function formatTehranDate(value: string) {
  return new Date(value).toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function rewardLabel(rule: RewardSummary) {
  const reward = rule.reward;
  if (reward.type === "free_game") return "یک نصب بازی رایگان";
  if (reward.type === "free_shipping") {
    return `ارسال رایگان${reward.maxShippingCost ? ` تا سقف ${toman(reward.maxShippingCost)}` : ""}`;
  }
  if (reward.type === "percent") {
    return `${reward.value.toLocaleString("fa-IR")}٪ تخفیف${reward.maxDiscountAmount ? ` تا سقف ${toman(reward.maxDiscountAmount)}` : ""}`;
  }
  return `${toman(reward.value)} تخفیف`;
}

export function selectedRewardLabel(item: AppointmentItem) {
  const selected = item.rewardSummary?.selectedReward || item.selectedReward;
  if (selected?.rewardDescription) return selected.rewardDescription;
  const reward = selected?.snapshot?.reward;
  if (!reward) return "";
  return rewardLabel({
    _id: selected._id,
    title: selected.snapshot?.title || "",
    eligibleServices: selected.snapshot?.eligibleServices || [],
    reward,
  });
}

export type CourierView = NonNullable<AppointmentItem["courierSummary"]>;

export function getCourierView(item: AppointmentItem): CourierView | null {
  if (item.courierSummary) return item.courierSummary;
  if (!item.courier) return null;

  return {
    status: item.courier.status,
    pickupDate: item.courier.pickupDate || item.startsAt,
    pickupWindow: item.courier.pickupWindow || { start: "", end: "" },
    regionTitle: item.courier.regionTitle || "",
    shippingBaseAmount:
      item.pricing?.shippingBaseAmount ??
      item.courier.totalShippingCost ??
      0,
    shippingDiscountAmount:
      item.pricing?.shippingDiscountAmount ??
      item.courier.freeShippingDiscount ??
      0,
    shippingFinalAmount:
      item.pricing?.shippingFinalAmount ??
      item.courier.finalShippingCost ??
      0,
    address: {
      recipientName:
        item.courier.addressSnapshot?.recipientName || item.customerName,
      recipientPhone:
        item.courier.addressSnapshot?.recipientPhone || item.phone,
      city: item.courier.addressSnapshot?.city || "",
      address: item.courier.addressSnapshot?.address || "",
    },
  };
}
