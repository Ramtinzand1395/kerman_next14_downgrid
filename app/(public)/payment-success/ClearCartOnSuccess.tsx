"use client";

import { useEffect } from "react";
import useCartStore from "@/stores/cartStore";

export default function ClearCartOnSuccess({
  items,
}: {
  items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
}) {
  const removePurchasedItems = useCartStore(
    (state) => state.removePurchasedItems,
  );

  useEffect(() => {
    removePurchasedItems(items);
  }, [items, removePurchasedItems]);

  return null;
}
