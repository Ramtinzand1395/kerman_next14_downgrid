export interface CouponLine {
  productId: string;
  categoryIds?: string[];
  amount: number;
}

export function eligibleCouponAmount(
  orderAmount: number,
  items: CouponLine[],
  productIds: string[],
  categoryIds: string[],
) {
  if (!productIds.length && !categoryIds.length) {
    return { matches: true, amount: Math.max(0, Math.round(orderAmount)) };
  }
  const products = new Set(productIds);
  const categories = new Set(categoryIds);
  const matchingItems = items.filter(
    (item) =>
      products.has(item.productId) ||
      (item.categoryIds ?? []).some((categoryId) => categories.has(categoryId)),
  );
  return {
    matches: matchingItems.length > 0,
    amount: matchingItems.reduce(
      (sum, item) => sum + Math.max(0, Math.round(Number(item.amount) || 0)),
      0,
    ),
  };
}

export function computeCouponDiscount(input: {
  type: "percent" | "fixed";
  value: number;
  maxDiscountAmount?: number | null;
  eligibleAmount: number;
}) {
  const eligible = Math.max(0, Math.round(input.eligibleAmount));
  let discount =
    input.type === "percent"
      ? Math.floor((eligible * input.value) / 100)
      : Math.round(input.value);
  if (input.type === "percent" && input.maxDiscountAmount) {
    discount = Math.min(discount, input.maxDiscountAmount);
  }
  return Math.max(0, Math.min(discount, eligible));
}

