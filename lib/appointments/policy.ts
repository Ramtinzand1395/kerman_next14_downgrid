import crypto from "crypto";

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rejected",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type ServiceType = "game_install" | "repair";

export const GAME_INSTALL_DEVICE_IDS = ["ps5", "ps4"] as const;
export const LEGACY_REPAIR_DEVICE_IDS = ["ps2", "ps1"] as const;

export function supportedDevicesForService(
  serviceType: ServiceType,
  configuredDevices: readonly string[],
) {
  if (serviceType === "game_install") {
    return [...GAME_INSTALL_DEVICE_IDS];
  }

  return Array.from(
    new Set([...configuredDevices, ...LEGACY_REPAIR_DEVICE_IDS]),
  );
}
export type FulfillmentType = "in_store" | "courier";

export const COURIER_STATUSES = [
  "pending",
  "scheduled",
  "assigned",
  "picked_up",
  "at_store",
  "return_ready",
  "returning",
  "delivered",
  "cancelled",
] as const;

export type CourierStatus = (typeof COURIER_STATUSES)[number];

export const USER_CANCELLABLE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

const ADMIN_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show", "rejected"],
  completed: ["confirmed"],
  cancelled: [],
  no_show: [],
  rejected: [],
};

export function canAdminTransition(from: AppointmentStatus, to: AppointmentStatus) {
  return from === to || ADMIN_TRANSITIONS[from].includes(to);
}

export const COURIER_TRANSITIONS: Record<CourierStatus, CourierStatus[]> = {
  pending: ["scheduled", "cancelled"],
  scheduled: ["assigned", "picked_up", "cancelled"],
  assigned: ["picked_up", "scheduled", "cancelled"],
  picked_up: ["at_store"],
  at_store: ["return_ready"],
  return_ready: ["returning"],
  returning: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canCourierTransition(from: CourierStatus, to: CourierStatus): boolean {
  return from === to || (COURIER_TRANSITIONS[from]?.includes(to) ?? false);
}

export function courierUserCancellationAllowed(courierStatus: CourierStatus): boolean {
  return ["pending", "scheduled", "assigned"].includes(courierStatus);
}

export function canonicalPayloadHash(payload: Record<string, unknown>) {
  const canonical = JSON.stringify(
    Object.keys(payload).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = payload[key];
      return result;
    }, {}),
  );
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function slotKey(serviceType: ServiceType, startsAt: Date) {
  return `${serviceType}:${startsAt.toISOString()}`;
}

export function courierSlotKey(date: string, start: string, end: string) {
  return `courier:${date}:${start}-${end}`;
}

export function formatRewardDescription(reward: {
  type: "fixed" | "percent" | "free_game" | "free_shipping";
  value?: number;
  maxDiscountAmount?: number | null;
  maxShippingCost?: number | null;
  shippingRegion?: string;
}): string {
  switch (reward.type) {
    case "percent": {
      const pct = `${(reward.value ?? 0).toLocaleString("fa-IR")}٪ تخفیف`;
      return reward.maxDiscountAmount && reward.maxDiscountAmount > 0
        ? `${pct} تا سقف ${reward.maxDiscountAmount.toLocaleString("fa-IR")} تومان`
        : pct;
    }
    case "fixed":
      return `${(reward.value ?? 0).toLocaleString("fa-IR")} تومان تخفیف`;
    case "free_game":
      return "یک نصب بازی رایگان";
    case "free_shipping": {
      const regionNote = reward.shippingRegion ? ` (${reward.shippingRegion})` : "";
      return reward.maxShippingCost && reward.maxShippingCost > 0
        ? `ارسال رایگان تا سقف ${reward.maxShippingCost.toLocaleString("fa-IR")} تومان${regionNote}`
        : `ارسال رایگان با پیک${regionNote}`;
    }
    default:
      return "پاداش نوبت";
  }
}

export function computeRewardDiscount(input: {
  type: "fixed" | "percent" | "free_game" | "free_shipping";
  value: number;
  maxDiscountAmount?: number | null;
  baseAmount: number;
  serviceType: ServiceType;
}) {
  const base = Math.max(0, Math.round(input.baseAmount));
  if (!base || input.type === "free_shipping") return 0;
  if (input.type === "free_game" && input.serviceType !== "game_install") return 0;
  let discount = input.type === "percent"
    ? Math.floor((base * Math.max(0, input.value)) / 100)
    : input.type === "free_game" ? base : Math.max(0, Math.round(input.value));
  if (input.maxDiscountAmount && input.maxDiscountAmount > 0) {
    discount = Math.min(discount, Math.round(input.maxDiscountAmount));
  }
  return Math.min(base, discount);
}

export interface AppointmentPricingDetails {
  known: boolean;
  serviceBaseAmount: number | null;
  serviceDiscountAmount: number;
  serviceFinalAmount: number | null;
  shippingBaseAmount: number;
  shippingDiscountAmount: number;
  shippingFinalAmount: number;
  totalDiscountAmount: number;
  finalAmount: number | null;
  baseAmount: number | null;
  discountAmount: number;
}

export function computeAppointmentPricing(input: {
  fulfillment: FulfillmentType;
  serviceType: ServiceType;
  serviceBaseAmount?: number | null;
  shippingBaseAmount?: number;
  reward?: {
    type: "fixed" | "percent" | "free_game" | "free_shipping";
    value: number;
    maxDiscountAmount?: number | null;
    minAmount?: number;
    maxShippingCost?: number | null;
    shippingRegion?: string;
  } | null;
  deliveryCity?: string;
}): AppointmentPricingDetails {
  const isCourier = input.fulfillment === "courier";
  const shippingBase = isCourier ? Math.max(0, Math.round(input.shippingBaseAmount ?? 0)) : 0;
  const rawServiceBase =
    input.serviceBaseAmount !== undefined && input.serviceBaseAmount !== null
      ? Math.max(0, Math.round(input.serviceBaseAmount))
      : null;

  let serviceDiscount = 0;
  let shippingDiscount = 0;

  if (input.reward) {
    const minAmount = Math.max(0, input.reward.minAmount ?? 0);
    if (input.reward.type === "free_shipping") {
      if (isCourier) {
        const regionMatch =
          !input.reward.shippingRegion ||
          (input.deliveryCity &&
            input.deliveryCity.trim().toLowerCase() ===
              input.reward.shippingRegion.trim().toLowerCase());
        if (regionMatch) {
          shippingDiscount =
            input.reward.maxShippingCost && input.reward.maxShippingCost > 0
              ? Math.min(shippingBase, Math.round(input.reward.maxShippingCost))
              : shippingBase;
        }
      }
    } else if (rawServiceBase !== null && rawServiceBase >= minAmount) {
      serviceDiscount = computeRewardDiscount({
        type: input.reward.type,
        value: input.reward.value,
        maxDiscountAmount: input.reward.maxDiscountAmount,
        baseAmount: rawServiceBase,
        serviceType: input.serviceType,
      });
    }
  }

  const shippingFinal = Math.max(0, shippingBase - shippingDiscount);
  const serviceFinal =
    rawServiceBase !== null ? Math.max(0, rawServiceBase - serviceDiscount) : null;
  const totalDiscount = serviceDiscount + shippingDiscount;
  const finalAmount = serviceFinal !== null ? serviceFinal + shippingFinal : null;

  return {
    known: rawServiceBase !== null,
    serviceBaseAmount: rawServiceBase,
    serviceDiscountAmount: serviceDiscount,
    serviceFinalAmount: serviceFinal,
    shippingBaseAmount: shippingBase,
    shippingDiscountAmount: shippingDiscount,
    shippingFinalAmount: shippingFinal,
    totalDiscountAmount: totalDiscount,
    finalAmount,
    baseAmount: rawServiceBase,
    discountAmount: totalDiscount,
  };
}

export function cancellationAllowed(startsAt: Date, now: Date, minimumNoticeMinutes: number) {
  return startsAt.getTime() - now.getTime() >= minimumNoticeMinutes * 60_000;
}

export async function claimFirstAvailableSeat<T>(
  capacity: number,
  claim: (seat: number) => Promise<T | null>,
) {
  for (let seat = 1; seat <= Math.max(0, Math.floor(capacity)); seat += 1) {
    const result = await claim(seat);
    if (result) return result;
  }
  return null;
}

export function normalizeRewardRuleData<
  T extends {
    reward: {
      type: string;
      value?: number;
      maxDiscountAmount?: number | null;
      shippingRegion?: string;
      maxShippingCost?: number | null;
      eligibleInstallationTypes?: string[];
      eligibleDevices?: string[];
    };
  },
>(data: T): T {
  const normalized = {
    ...data,
    reward: {
      ...data.reward,
    },
  };
  const r = normalized.reward;
  if (r.type === "percent") {
    r.shippingRegion = "";
    r.maxShippingCost = null;
  } else if (r.type === "fixed") {
    r.shippingRegion = "";
    r.maxShippingCost = null;
    r.maxDiscountAmount = null;
  } else if (r.type === "free_game") {
    r.value = 0;
    r.maxDiscountAmount = null;
    r.shippingRegion = "";
    r.maxShippingCost = null;
  } else if (r.type === "free_shipping") {
    r.value = 0;
    r.maxDiscountAmount = null;
    r.eligibleInstallationTypes = [];
  }
  return normalized;
}

export function validateRewardRuleData(data: {
  startsAt?: Date | null;
  endsAt?: Date | null;
  reward?: {
    type: string;
    value?: number;
    maxDiscountAmount?: number | null;
    minAmount?: number;
    shippingRegion?: string;
    maxShippingCost?: number | null;
  };
}): { valid: boolean; error?: string } {
  if (
    data.startsAt &&
    data.endsAt &&
    new Date(data.endsAt).getTime() <= new Date(data.startsAt).getTime()
  ) {
    return { valid: false, error: "تاریخ پایان باید بعد از تاریخ شروع باشد." };
  }
  if (!data.reward) return { valid: false, error: "اطلاعات پاداش الزامی است." };
  if (data.reward.type === "percent") {
    const val = Number(data.reward.value ?? 0);
    if (val <= 0 || val > 100) {
      return { valid: false, error: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
    }
  }
  if (data.reward.type === "fixed") {
    const val = Number(data.reward.value ?? 0);
    if (val <= 0) {
      return { valid: false, error: "مبلغ تخفیف ثابت باید بیشتر از صفر باشد." };
    }
  }
  return { valid: true };
}
