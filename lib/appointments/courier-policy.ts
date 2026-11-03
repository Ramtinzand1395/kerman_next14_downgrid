import type { CourierStatus } from "../../types/appointments.ts";

export const COURIER_TRANSITIONS: Record<CourierStatus, CourierStatus[]> = {
  pending: ["return_ready", "cancelled"],
  scheduled: ["return_ready", "cancelled"],
  assigned: ["return_ready", "cancelled"],
  picked_up: ["return_ready", "cancelled"],
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
  { status: "return_ready", label: "تکمیل خدمات و آماده ارسال" },
  { status: "returning", label: "تحویل به پیک" },
  { status: "delivered", label: "تحویل به مشتری" },
] as const;

export function courierReturnDeliveryProgress(status: CourierStatus): 0 | 1 | 2 | 3 {
  if (status === "delivered") return 3;
  if (status === "returning") return 2;
  if (status === "return_ready") return 1;
  return 0;
}

// Pre-delivery legacy values are accepted on reads, but never required as actions.
export function courierStatusAfterService(
  current: CourierStatus,
  serviceStatus: string,
): CourierStatus {
  if (["delivered", "cancelled"].includes(current)) return current;
  if (["cancelled", "rejected", "no_show"].includes(serviceStatus)) return "cancelled";
  if (serviceStatus === "completed" && !["returning", "return_ready"].includes(current)) return "return_ready";
  if (serviceStatus === "confirmed" && current === "return_ready") return "pending";
  return current;
}
