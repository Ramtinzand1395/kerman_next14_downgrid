import { deliverBusinessSms } from "@/lib/sms/business";
import { buildOrderIdentifiers } from "@/lib/orderIdentifierValue";

// Melipayamak service-pattern IDs provided by the merchant.
// The screenshots showed pending approval for installation and paid-order patterns; provider approval must be checked before live use.
export const SERVICE_SMS_PATTERNS = {
  installationPayment: 577164,
  productOrderCreated: 577166,
  productOrderPaid: 577167,
} as const;

function validMobile(value: unknown): value is string {
  return typeof value === "string" && /^09\d{9}$/.test(value.trim());
}

function tomanAmount(value: number): string {
  return Math.round(value).toString();
}

export async function smsProductOrderCreated(order: {
  _id: unknown;
  trackingCode?: string | null;
  finalPrice: number;
  buyerSnapshot?: { mobile?: string | null } | null;
}) {
  const to = order.buyerSnapshot?.mobile?.trim();
  if (!validMobile(to)) return null;
  const orderId = String(order._id);
  return deliverBusinessSms({
    eventKey: `PRODUCT_ORDER_CREATED:${orderId}`,
    eventType: "PRODUCT_ORDER_CREATED",
    entityType: "Order",
    entityId: orderId,
    bodyId: SERVICE_SMS_PATTERNS.productOrderCreated,
    to,
    args: [order.trackingCode || buildOrderIdentifiers(orderId).trackingCode, tomanAmount(order.finalPrice)],
  });
}

export async function smsProductOrderPaid(order: {
  _id: unknown;
  trackingCode?: string | null;
  finalPrice: number;
  paymentStatus?: string | null;
  paymentRefId?: number | string | null;
  buyerSnapshot?: { mobile?: string | null } | null;
}) {
  if (order.paymentStatus !== "paid") return null;
  const to = order.buyerSnapshot?.mobile?.trim();
  if (!validMobile(to)) return null;
  const orderId = String(order._id);
  const ref = order.paymentRefId == null ? "" : String(order.paymentRefId);
  // The approved template requires a genuine payment reference; do not invent one for wallet payments.
  if (!ref) return null;
  return deliverBusinessSms({
    eventKey: `PRODUCT_ORDER_PAID:${orderId}`,
    eventType: "PRODUCT_ORDER_PAID",
    entityType: "Order",
    entityId: orderId,
    bodyId: SERVICE_SMS_PATTERNS.productOrderPaid,
    to,
    args: [order.trackingCode || buildOrderIdentifiers(orderId).trackingCode, tomanAmount(order.finalPrice), ref],
  });
}
