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

export const COURIER_ROUTES = ["pickup", "return", "round_trip"] as const;
export type CourierRoute = (typeof COURIER_ROUTES)[number];
export const courierRouteLabels: Record<CourierRoute, string> = {
  pickup: "فقط رفت: مشتری به فروشگاه",
  return: "فقط برگشت: فروشگاه به مشتری",
  round_trip: "رفت‌وبرگشت",
};

// Missing route keeps legacy requests readable without rewriting historical prices.
export function courierRouteLabel(route?: CourierRoute) {
  return courierRouteLabels[route || "round_trip"];
}

export function courierShippingCosts(oneWayCost: number, route?: CourierRoute, legacyMultiplier = 2) {
  const pickupShippingCost = route === "return" ? 0 : oneWayCost;
  const returnShippingCost = route === "pickup" || (!route && legacyMultiplier <= 1) ? 0 : oneWayCost;
  return { pickupShippingCost, returnShippingCost, totalShippingCost: pickupShippingCost + returnShippingCost };
}

export function courierNextStatuses(from: CourierStatus, route?: CourierRoute): CourierStatus[] {
  return (COURIER_TRANSITIONS[from] || []).filter(to =>
    !(route === "return" && ["assigned", "picked_up", "at_store"].includes(to)) &&
    !(route === "pickup" && ["return_ready", "returning", "delivered"].includes(to)));
}

export function canCourierTransition(from: CourierStatus, to: CourierStatus, route?: CourierRoute): boolean {
  return from === to || courierNextStatuses(from, route).includes(to);
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
  route?: CourierRoute,
): CourierStatus {
  if (["delivered", "cancelled"].includes(current)) return current;
  if (["cancelled", "rejected", "no_show"].includes(serviceStatus)) return "cancelled";
  if (route === "pickup") return current;
  if (route === "return" && serviceStatus === "confirmed" && current === "return_ready") return "pending";
  if (serviceStatus === "completed" && !["returning", "return_ready"].includes(current)) return "return_ready";
  if (serviceStatus === "confirmed" && current === "return_ready") return "picked_up";
  return current;
}

export function courierStages(route?: CourierRoute): ReadonlyArray<{ status: CourierStatus; label: string }> {
  if (route === "pickup") return COURIER_RETURN_DELIVERY_STAGES.slice(0, 2);
  if (route === "return") return [
    { status: "return_ready", label: "تکمیل خدمات و آماده ارسال" },
    { status: "returning", label: "حرکت به سمت مشتری" },
  ];
  return COURIER_RETURN_DELIVERY_STAGES;
}

export function courierStageProgress(status: CourierStatus, route?: CourierRoute) {
  if (status === "cancelled") return 0;
  if (route === "return") return ["returning", "delivered"].includes(status) ? 2 : status === "return_ready" ? 1 : 0;
  return Math.min(courierStages(route).length, courierReturnDeliveryProgress(status));
}
