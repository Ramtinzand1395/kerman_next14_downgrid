import type { CourierStatus } from "../../types/appointments.ts";

export const COURIER_ACTION_STATUSES = ["assigned", "at_store", "returning", "delivered", "cancelled"] as const;

export const COURIER_TRANSITIONS: Record<CourierStatus, CourierStatus[]> = {
  pending: ["assigned", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["at_store", "cancelled"],
  picked_up: ["at_store", "cancelled"],
  at_store: ["return_ready", "cancelled"],
  return_ready: ["returning"],
  returning: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canCourierTransition(from: CourierStatus, to: CourierStatus): boolean {
  return from === to || (COURIER_TRANSITIONS[from]?.includes(to) ?? false);
}

export const COURIER_RETURN_DELIVERY_STAGES = [
  { status: "assigned", label: "حرکت از فروشگاه به سمت مشتری" },
  { status: "at_store", label: "تحویل دستگاه به مغازه" },
  { status: "returning", label: "حرکت به سمت مشتری پس از خدمات" },
] as const;

export function courierReturnDeliveryProgress(status: CourierStatus): 0 | 1 | 2 | 3 {
  if (status === "delivered" || status === "returning") return 3;
  if (["at_store", "return_ready"].includes(status)) return 2;
  if (["assigned", "picked_up"].includes(status)) return 1;
  return 0;
}

export function courierStatusAfterService(
  current: CourierStatus,
  serviceStatus: string,
): CourierStatus {
  if (["delivered", "cancelled"].includes(current)) return current;
  if (["cancelled", "rejected", "no_show"].includes(serviceStatus)) return "cancelled";
  if (serviceStatus === "completed" && !["returning", "return_ready"].includes(current)) return "return_ready";
  if (serviceStatus === "confirmed" && current === "return_ready") return "at_store";
  return current;
}
