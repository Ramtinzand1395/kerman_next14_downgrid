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

  return {
    client_id: session.clientId,
    timestamp_micros: order.paymentVerifiedAt.getTime() * 1000,
    events: [{
      name: "purchase",
      params: {
        ...commerce,
        value: merchandiseTotal * 10,
        transaction_id: order._id.toString(),
        shipping: shipping * 10,
        session_id: session.sessionId,
        engagement_time_msec: 1,
        ...(debugMode ? { debug_mode: 1 } : {}),
      },
    }],
  };
}
