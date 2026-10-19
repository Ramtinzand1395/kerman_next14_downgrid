export interface ShippingDestination {
  province: unknown;
  city: unknown;
}

export class InvalidShippingDestinationError extends Error {
  constructor() {
    super("آدرس ارسال معتبر نیست.");
    this.name = "InvalidShippingDestinationError";
  }
}

export type ShippingPaymentType = "PREPAID" | "COLLECT";

export const KERMAN_SHIPPING_COST = 50_000;
export const COLLECT_SHIPPING_COST = 0;
export const COLLECT_SHIPPING_LABEL = "پس‌کرایه";
export const COLLECT_SHIPPING_NOTE =
  "هزینه حمل هنگام تحویل توسط شرکت حمل‌ونقل دریافت می‌شود.";

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
  cost: number;
  paymentType: ShippingPaymentType;
  isKerman: boolean;
  label: string;
  description?: string;
}

/**
 * Calculates shipping details based on destination.
 * - Kerman city: 100,000 Tomans, PREPAID
 * - All other cities and provinces: 0 Tomans, COLLECT (پس‌کرایه)
 */
export function calculateShippingInfo(
  destination: ShippingDestination,
): ShippingCalculation {
  const province =
    typeof destination?.province === "string"
      ? destination.province.trim()
      : "";
  const city =
    typeof destination?.city === "string" ? destination.city.trim() : "";

  if (!province || !city) {
    throw new InvalidShippingDestinationError();
  }

  if (isKermanCity(city)) {
    return {
      cost: KERMAN_SHIPPING_COST,
      paymentType: "PREPAID",
      isKerman: true,
      label: `${KERMAN_SHIPPING_COST.toLocaleString("fa-IR")} تومان`,
    };
  }

  return {
    cost: COLLECT_SHIPPING_COST,
    paymentType: "COLLECT",
    isKerman: false,
    label: COLLECT_SHIPPING_LABEL,
    description: COLLECT_SHIPPING_NOTE,
  };
}

/**
 * Returns numeric shipping cost for destination.
 */
export function calculateShippingCost(
  destination: ShippingDestination,
): number {
  return calculateShippingInfo(destination).cost;
}

/**
 * Formats shipping display for UI across orders, admin dashboard, and profiles.
 * Preserves backward compatibility for legacy orders where shippingPaymentType was not recorded.
 */
export function formatOrderShippingDisplay(order: {
  shippingCost?: number | null;
  shippingPaymentType?: string | null;
}): {
  label: string;
  subtext?: string;
  isCollect: boolean;
} {
  if (order?.shippingPaymentType === "COLLECT") {
    return {
      label: COLLECT_SHIPPING_LABEL,
      subtext: COLLECT_SHIPPING_NOTE,
      isCollect: true,
    };
  }

  const cost = Number(order?.shippingCost || 0);

  if (order?.shippingPaymentType === "PREPAID" || cost > 0) {
    return {
      label: `${cost.toLocaleString("fa-IR")} تومان`,
      isCollect: false,
    };
  }

  // Fallback for legacy orders
  return {
    label: "رایگان (سفارش قبلی)",
    isCollect: false,
  };
}
