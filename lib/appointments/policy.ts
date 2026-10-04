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
