import { Iran } from "provinces-and-cities";

export type ShippingMethod = "kerman_local" | "national_collect";
export type ShippingPaymentTiming = "online" | "on_delivery";
export type ShippingFeeStatus = "fixed" | "pending_carrier";

export interface ShippingDestination {
  province: unknown;
  city: unknown;
  postalCode?: unknown;
  address?: unknown;
}

export class InvalidShippingDestinationError extends Error {
  constructor(message = "آدرس ارسال معتبر نیست.") {
    super(message);
    this.name = "InvalidShippingDestinationError";
  }
}

export type ShippingPaymentType = "PREPAID" | "COLLECT";

export const KERMAN_SHIPPING_COST = 150_000;
export const COLLECT_SHIPPING_LABEL = "پس‌کرایه";
export const LOCAL_SHIPPING_DESCRIPTION =
  "ارسال سفارش در محدوده تحت پوشش شهر کرمان با هزینه ثابت ۱۵۰٬۰۰۰ تومان انجام می‌شود.";
export const COLLECT_SHIPPING_NOTE =
  "ارسال به سراسر ایران به‌صورت پس‌کرایه انجام می‌شود. هزینه حمل هنگام تحویل مرسوله و براساس تعرفه شرکت حمل‌ونقل دریافت خواهد شد.";

export interface StoreShippingSettings {
  version: 1;
  localDelivery: {
    enabled: boolean;
    feeToman: number;
    title: string;
    description: string;
  };
  nationalCollect: {
    enabled: boolean;
    availableForLocalAddresses: boolean;
    title: string;
    description: string;
  };
  coverage: {
    province: string;
    cities: string[];
    postalCodePrefixes: string[];
  };
}

export const DEFAULT_SHIPPING_SETTINGS: StoreShippingSettings = {
  version: 1,
  localDelivery: {
    enabled: true,
    feeToman: KERMAN_SHIPPING_COST,
    title: "ارسال شهری کرمان",
    description: LOCAL_SHIPPING_DESCRIPTION,
  },
  nationalCollect: {
    enabled: true,
    availableForLocalAddresses: true,
    title: "ارسال سراسری پس‌کرایه",
    description: COLLECT_SHIPPING_NOTE,
  },
  coverage: {
    province: "کرمان",
    cities: ["کرمان"],
    postalCodePrefixes: [],
  },
};

export function formatLocalShippingPolicyText(feeToman: number): string {
  return `ارسال سفارش در محدوده تحت پوشش شهر کرمان با هزینه ثابت ${feeToman.toLocaleString("fa-IR")} تومان انجام می‌شود.`;
}

export class ShippingMethodUnavailableError extends Error {
  constructor() {
    super("روش ارسال انتخاب‌شده برای این آدرس در دسترس نیست.");
    this.name = "ShippingMethodUnavailableError";
  }
}

/**
 * Normalizes Persian/Arabic strings:
 * - Trims leading/trailing whitespace
 * - Unifies Arabic Kaf (ك) to Persian Kaf (ک)
 * - Unifies Arabic Yeh (ي) to Persian Yeh (ی)
 * - Strips zero-width characters and Arabic diacritics
 * - Normalizes multiple consecutive whitespace to a single space
 */
export function normalizeCityName(name: unknown): string {
  if (typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // ZWNJ, ZWJ, BOM
    .replace(/\u064A/g, "\u06CC") // Arabic Yeh -> Persian Yeh (ي -> ی)
    .replace(/\u0643/g, "\u06A9") // Arabic Kaf -> Persian Kaf (ك -> ک)
    .replace(/[\u064B-\u065F]/g, "") // Diacritics (fatha, damma, etc.)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether the city corresponds to Kerman city (county).
 * Note: Only Kerman city itself is PREPAID; other cities in Kerman province
 * (Rafsanjan, Sirjan, Bam, Jiroft, Zarand, etc.) are NOT Kerman city.
 */
export function isKermanCity(city: unknown): boolean {
  const normalized = normalizeCityName(city);
  if (!normalized) return false;

  if (normalized === "کرمان" || normalized === "kerman") {
    return true;
  }

  // Handle prefix like "شهرستان کرمان" or "شهر کرمان"
  const stripped = normalized.replace(/^(شهرستان|شهر)\s+/, "");
  if (stripped === "کرمان" || stripped === "kerman") {
    return true;
  }

  return false;
}

export interface ShippingCalculation {
  method: ShippingMethod;
  title: string;
  feeToman: number | null;
  /** Legacy alias. New code should use feeToman. */
  cost: number | null;
  paymentTiming: ShippingPaymentTiming;
  feeStatus: ShippingFeeStatus;
  paymentType: ShippingPaymentType;
  isKerman: boolean;
  label: string;
  description: string;
}

export interface OrderShippingSnapshot {
  method: ShippingMethod;
  title: string;
  feeToman: number | null;
  paymentTiming: ShippingPaymentTiming;
  feeStatus: ShippingFeeStatus;
  destinationCity: string;
  addressSnapshot: Record<string, unknown>;
}

function digits(value: unknown) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (character) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(character)))
    .replace(/[^0-9]/g, "");
}

export function isValidIranDestination(destination: ShippingDestination): boolean {
  const province = normalizeCityName(destination?.province);
  const city = normalizeCityName(destination?.city);
  if (!province || !city) return false;

  return Iran.main.some(
    (entry) =>
      normalizeCityName(entry.name) === province &&
      entry.cities.some((entryCity) => normalizeCityName(entryCity) === city),
  );
}

export function assertValidShippingDestination(destination: ShippingDestination) {
  if (!isValidIranDestination(destination)) {
    throw new InvalidShippingDestinationError();
  }
}

export function isDestinationInLocalCoverage(
  destination: ShippingDestination,
  settings: StoreShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): boolean {
  if (!isValidIranDestination(destination)) return false;
  const provinceMatches =
    normalizeCityName(destination.province) === normalizeCityName(settings.coverage.province);
  const cityMatches = settings.coverage.cities.some(
    (city) => normalizeCityName(city) === normalizeCityName(destination.city),
  );
  if (!provinceMatches || !cityMatches) return false;

  const prefixes = settings.coverage.postalCodePrefixes.map(digits).filter(Boolean);
  if (prefixes.length === 0) return true;
  const postalCode = digits(destination.postalCode);
  return postalCode.length === 10 && prefixes.some((prefix) => postalCode.startsWith(prefix));
}

export function getAvailableShippingMethods(
  destination: ShippingDestination,
  settings: StoreShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): ShippingCalculation[] {
  assertValidShippingDestination(destination);
  const isLocal = isDestinationInLocalCoverage(destination, settings);
  const methods: ShippingCalculation[] = [];

  if (isLocal && settings.localDelivery.enabled) {
    const fee = settings.localDelivery.feeToman;
    methods.push({
      method: "kerman_local",
      title: settings.localDelivery.title,
      feeToman: fee,
      cost: fee,
      paymentTiming: "online",
      feeStatus: "fixed",
      paymentType: "PREPAID",
      isKerman: true,
      label: `${fee.toLocaleString("fa-IR")} تومان`,
      description: settings.localDelivery.description,
    });
  }

  if (
    settings.nationalCollect.enabled &&
    (!isLocal || settings.nationalCollect.availableForLocalAddresses)
  ) {
    methods.push({
      method: "national_collect",
      title: settings.nationalCollect.title,
      feeToman: null,
      cost: null,
      paymentTiming: "on_delivery",
      feeStatus: "pending_carrier",
      paymentType: "COLLECT",
      isKerman: isLocal,
      label: COLLECT_SHIPPING_LABEL,
      description: settings.nationalCollect.description,
    });
  }

  return methods;
}

/**
 * Calculates shipping details based on destination.
 * - Kerman city: the configured fixed fee, PREPAID
 * - All other cities and provinces: unknown carrier fee, COLLECT (پس‌کرایه)
 */
export function calculateShippingInfo(
  destination: ShippingDestination,
  method?: ShippingMethod | null,
  settings: StoreShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): ShippingCalculation {
  const available = getAvailableShippingMethods(destination, settings);
  const selected = method
    ? available.find((option) => option.method === method)
    : available[0];
  if (!selected) throw new ShippingMethodUnavailableError();
  return selected;
}

export function createOrderShippingSnapshot(
  selection: ShippingCalculation,
  addressSnapshot: Record<string, unknown>,
): OrderShippingSnapshot {
  return {
    method: selection.method,
    title: selection.title,
    feeToman: selection.feeToman,
    paymentTiming: selection.paymentTiming,
    feeStatus: selection.feeStatus,
    destinationCity: String(addressSnapshot.city ?? ""),
    addressSnapshot,
  };
}

/**
 * Formats shipping display for UI across orders, admin dashboard, and profiles.
 * Preserves backward compatibility for legacy orders where shippingPaymentType was not recorded.
 */
export function formatOrderShippingDisplay(order: {
  shipping?: Partial<OrderShippingSnapshot> | null;
  shippingCost?: number | null;
  shippingPaymentType?: string | null;
}): {
  title: string;
  label: string;
  subtext?: string;
  isCollect: boolean;
  feeToman: number | null;
} {
  if (order.shipping?.method === "national_collect") {
    return {
      title: order.shipping.title || DEFAULT_SHIPPING_SETTINGS.nationalCollect.title,
      label: "طبق تعرفه شرکت حمل‌ونقل",
      subtext: COLLECT_SHIPPING_NOTE,
      isCollect: true,
      feeToman: null,
    };
  }
  if (order.shipping?.method === "kerman_local") {
    const fee = Number(order.shipping.feeToman);
    if (!Number.isSafeInteger(fee) || fee <= 0) {
      return {
        title: order.shipping.title || DEFAULT_SHIPPING_SETTINGS.localDelivery.title,
        label: "هزینه در داده سفارش ثبت نشده",
        subtext: "این مقدار نامشخص به معنی ارسال رایگان نیست.",
        isCollect: false,
        feeToman: null,
      };
    }
    return {
      title: order.shipping.title || DEFAULT_SHIPPING_SETTINGS.localDelivery.title,
      label: `${fee.toLocaleString("fa-IR")} تومان`,
      isCollect: false,
      feeToman: fee,
    };
  }
  if (order?.shippingPaymentType === "COLLECT") {
    return {
      title: DEFAULT_SHIPPING_SETTINGS.nationalCollect.title,
      label: "طبق تعرفه شرکت حمل‌ونقل",
      subtext: COLLECT_SHIPPING_NOTE,
      isCollect: true,
      feeToman: null,
    };
  }

  const cost = Number(order?.shippingCost);

  if (order?.shippingPaymentType === "PREPAID" || cost > 0) {
    return {
      title: "ارسال با هزینه ثبت‌شده",
      label: `${cost.toLocaleString("fa-IR")} تومان`,
      isCollect: false,
      feeToman: cost,
    };
  }

  return {
    title: "روش ارسال سفارش قدیمی",
    label: "در داده سفارش ثبت نشده",
    subtext: "هزینه نامشخص این سفارش قدیمی به معنی ارسال رایگان نیست.",
    isCollect: false,
    feeToman: null,
  };
}
