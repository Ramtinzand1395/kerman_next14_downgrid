export const GA_CURRENCY = "IRR";

interface ProductLine {
  productId: string;
  title: string;
  variant?: string | null;
  priceToman: number;
  quantity: number;
}

export function gaItem(line: ProductLine) {
  if (!line.productId || !Number.isFinite(line.priceToman) || line.priceToman < 0 ||
      !Number.isSafeInteger(line.quantity) || line.quantity < 1) return null;

  return {
    item_id: line.productId.slice(0, 100),
    item_name: line.title.slice(0, 100),
    item_variant: line.variant?.slice(0, 100) || undefined,
    price: line.priceToman * 10,
    quantity: line.quantity,
  };
}

export function ecommerceParams(lines: ProductLine[]) {
  const items = lines.map(gaItem).filter((item) => item !== null);
  return {
    currency: GA_CURRENCY,
    value: items.reduce((total, item) => total + item.price * item.quantity, 0),
    items,
  };
}

export interface AnalyticsSession {
  clientId: string;
  sessionId?: number;
}

export function parseAnalyticsSession(value: unknown): AnalyticsSession | undefined {
  if (!value || typeof value !== "object") return;
  const { clientId, sessionId } = value as Record<string, unknown>;
  if (typeof clientId !== "string" || !/^\d{1,20}\.\d{1,20}$/.test(clientId)) return;
  const session = typeof sessionId === "string" && /^\d{1,16}$/.test(sessionId)
    ? Number(sessionId)
    : sessionId;
  return {
    clientId,
    sessionId: typeof session === "number" && Number.isSafeInteger(session) && session > 0
      ? session
      : undefined,
  };
}

export function cartAnalyticsLine(item: {
  productId: string;
  productTitle?: string;
  title: string;
  variantTitle?: string;
  price: number;
  discountPrice: number | null;
  quantity: number;
}, quantity = item.quantity): ProductLine {
  return {
    productId: item.productId,
    title: item.productTitle || item.title,
    variant: item.variantTitle,
    priceToman: item.discountPrice ?? item.price,
    quantity,
  };
}
