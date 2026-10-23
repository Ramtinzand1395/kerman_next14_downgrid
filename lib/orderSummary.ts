export type OrderSummaryItem = {
  price?: number | null;
  discountPrice?: number | null;
  quantity?: number | null;
  total?: number | null;
};

export type OrderMoneySummary = {
  originalItemsTotal: number;
  itemsTotal: number;
  productDiscount: number;
  couponDiscount: number;
  shippingCost: number;
  payable: number;
  itemCount: number;
};

const money = (value: unknown) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};

/**
 * Historical order totals have one important contract: totalPrice is already
 * the sum of lines after product discounts. Product discounts must never be
 * subtracted from it again.
 */
export function summarizeOrderMoney(input: {
  items?: OrderSummaryItem[] | null;
  totalPrice?: number | null;
  couponDiscount?: number | null;
  shippingCost?: number | null;
  finalPrice?: number | null;
}): OrderMoneySummary {
  const items = Array.isArray(input.items) ? input.items : [];
  const originalItemsTotal = items.reduce(
    (sum, item) => sum + money(item.price) * money(item.quantity),
    0,
  );
  const lineItemsTotal = items.reduce(
    (sum, item) => sum + money(item.total),
    0,
  );
  const storedItemsTotal = money(input.totalPrice);
  const itemsTotal = storedItemsTotal || lineItemsTotal;
  const couponDiscount = Math.min(money(input.couponDiscount), itemsTotal);
  const shippingCost = money(input.shippingCost);
  const calculatedPayable = Math.max(
    0,
    itemsTotal - couponDiscount + shippingCost,
  );
  const storedFinalPrice = money(input.finalPrice);

  return {
    originalItemsTotal: Math.max(originalItemsTotal, itemsTotal),
    itemsTotal,
    productDiscount: Math.max(0, originalItemsTotal - itemsTotal),
    couponDiscount,
    shippingCost,
    payable: storedFinalPrice || calculatedPayable,
    itemCount: items.reduce((sum, item) => sum + money(item.quantity), 0),
  };
}
