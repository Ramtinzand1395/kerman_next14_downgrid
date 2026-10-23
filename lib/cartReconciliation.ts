export type PurchasedCartLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export function subtractPurchasedItems<
  T extends {
    productId: string;
    variantId?: string | null;
    quantity: number;
  },
>(cart: T[], purchasedItems: PurchasedCartLine[]): T[] {
  return cart.flatMap((cartItem) => {
    const purchasedQuantity = purchasedItems
      .filter(
        (item) =>
          item.productId === cartItem.productId &&
          (item.variantId || null) === (cartItem.variantId || null),
      )
      .reduce((sum, item) => sum + Math.max(0, item.quantity), 0);

    if (purchasedQuantity <= 0) return [cartItem];
    const nextQuantity = cartItem.quantity - purchasedQuantity;
    return nextQuantity > 0
      ? [{ ...cartItem, quantity: nextQuantity }]
      : [];
  });
}
