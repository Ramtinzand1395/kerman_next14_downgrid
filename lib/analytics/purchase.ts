import { ecommerceParams, type AnalyticsSession } from "./ecommerce";

export interface PurchaseOrder {
  _id: { toString(): string };
  paymentVerifiedAt: Date;
  finalPrice: number;
  shippingCost?: number | null;
  items: {
    product: { toString(): string };
    productTitle?: string | null;
    variantTitle?: string | null;
    price: number;
    discountPrice?: number | null;
    quantity: number;
    total: number;
  }[];
}

// IRR is not supported for GA4 monetization reporting. Conversion must be
// explicitly configured; never treat a toman amount as USD/EUR/AED.
function reportingConversion() {
  const currency = process.env.GA4_REPORTING_CURRENCY?.trim().toUpperCase();
  const tomanPerUnit = Number(process.env.GA4_TOMAN_PER_REPORTING_UNIT);
  if (!currency || !["USD", "EUR", "AED"].includes(currency) ||
      !Number.isFinite(tomanPerUnit) || tomanPerUnit <= 0) return null;
  return { currency, tomanPerUnit };
}

export function purchasePayload(order: PurchaseOrder, session: AnalyticsSession, debugMode: boolean) {
  const shipping = order.shippingCost ?? 0;
  const merchandiseTotal = Math.max(0, order.finalPrice - shipping);
  const itemsTotal = order.items.reduce((sum, item) => sum + item.total, 0);
  const netFactor = itemsTotal > 0 ? merchandiseTotal / itemsTotal : 1;
  const commerce = ecommerceParams(order.items.map((item) => ({
    productId: item.product.toString(),
    title: item.productTitle || "",
    variant: item.variantTitle,
    priceToman: (item.discountPrice ?? item.price) * netFactor,
    quantity: item.quantity,
  })));

  const conversion = reportingConversion();
  // ecommerceParams converts toman to rial (*10). With a configured reporting
  // currency, translate that rial amount back to toman, then to the target unit.
  const factor = conversion ? 1 / (10 * conversion.tomanPerUnit) : 1;

  return {
    client_id: session.clientId,
    timestamp_micros: order.paymentVerifiedAt.getTime() * 1000,
    events: [{
      name: "purchase",
      params: {
        ...commerce,
        ...(conversion ? { currency: conversion.currency } : {}),
        items: commerce.items.map((item) => ({
          ...item,
          price: item.price * factor,
        })),
        value: merchandiseTotal * 10 * factor,
        transaction_id: order._id.toString(),
        shipping: shipping * 10 * factor,
        // Preserve the exact original store amounts for custom GA4 metrics.
        value_toman: merchandiseTotal,
        shipping_toman: shipping,
        session_id: session.sessionId,
        engagement_time_msec: 1,
        ...(debugMode ? { debug_mode: 1 } : {}),
      },
    }],
  };
}
