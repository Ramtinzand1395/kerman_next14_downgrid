"use client";

import { useEffect, useRef } from "react";
import { trackCommerce } from "@/lib/analytics/browser";

export default function TrackProductView({ productId, title, priceToman }: {
  productId: string;
  title: string;
  priceToman: number;
}) {
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (viewed.current === productId) return;
    viewed.current = productId;
    trackCommerce("view_item", [{ productId, title, priceToman, quantity: 1 }]);
  }, [productId, title, priceToman]);
  return null;
}
