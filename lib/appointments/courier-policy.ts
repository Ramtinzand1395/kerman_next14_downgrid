import type { CourierStatus } from "../../types/appointments.ts";

export const COURIER_ACTION_STATUSES = ["assigned", "picked_up", "returning", "cancelled"] as const;

export const COURIER_TRANSITIONS: Record<CourierStatus, CourierStatus[]> = {
  pending: ["assigned", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["return_ready", "cancelled"],
  at_store: ["return_ready", "cancelled"],
  return_ready: ["returning"],
  returning: [],
  delivered: [],
  cancelled: [],
};

export function canCourierTransition(from: CourierStatus, to: CourierStatus): boolean {
  return from === to || (COURIER_TRANSITIONS[from]?.includes(to) ?? false);
}

export const COURIER_RETURN_DELIVERY_STAGES = [
  { status: "assigned", label: "حرکت از فروشگاه به سمت مشتری" },
  { status: "picked_up", label: "تحویل دستگاه به پیک" },
  { status: "returning", label: "حرکت به سمت مشتری پس از خدمات" },
] as const;

export function courierReturnDeliveryProgress(status: CourierStatus): 0 | 1 | 2 | 3 {
  if (status === "delivered" || status === "returning") return 3;
  if (["picked_up", "at_store", "return_ready"].includes(status)) return 2;
  if (status === "assigned") return 1;
  return 0;
}

// Older scheduled/at_store values remain readable without adding extra actions.
export function courierStatusAfterService(
  current: CourierStatus,
  serviceStatus: string,
): CourierStatus {
  if (["delivered", "cancelled"].includes(current)) return current;
  if (["cancelled", "rejected", "no_show"].includes(serviceStatus)) return "cancelled";
  if (serviceStatus === "completed" && !["returning", "return_ready"].includes(current)) return "return_ready";
  if (serviceStatus === "confirmed" && current === "return_ready") return "picked_up";
  return current;
}
