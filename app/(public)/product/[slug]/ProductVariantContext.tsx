"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import type { Product, ProductVariant } from "@/types";
import { getDefaultVariant, isVariantMappedForSale } from "@/lib/variantSelector";

interface ProductVariantContextValue {
  product: Product;
  activeVariants: ProductVariant[];
  selectedVariantId: string;
  selectedVariant: ProductVariant | undefined;
  isMulti: boolean;
  effectivePrice: number;
  effectiveDiscountPrice: number | null;
  finalPrice: number;
  effectiveStock: number;
  effectiveSku: string;
  isOutOfStock: boolean;
  requiresSelection: boolean;
  setSelectedVariantId: (variantId: string) => void;
}

const ProductVariantContext = createContext<
  ProductVariantContextValue | undefined
>(undefined);

export function ProductVariantProvider({
  product,
  initialVariantId,
  children,
}: {
  product: Product;
  initialVariantId?: string;
  children: React.ReactNode;
}) {
  const activeVariants = useMemo<ProductVariant[]>(() => {
    if (!Array.isArray(product.variants)) return [];
    return (product.variants as ProductVariant[]).filter(
      (v) => v.isActive !== false,
    );
  }, [product.variants]);

  const isMulti =
    product.productType === "multi" && activeVariants.length > 0;

  const [selectedVariantId, setSelectedVariantIdState] = useState<string>(() => {
    if (!isMulti) return "";
    return String(getDefaultVariant(activeVariants, product.variantSelector, initialVariantId)?._id || "");
  });

  const selectedVariant = useMemo(() => {
    if (!isMulti) return undefined;
    return activeVariants.find(
      (v) => String(v._id) === String(selectedVariantId),
    );
  }, [isMulti, activeVariants, selectedVariantId]);

  // Recover if the selected model is removed or disconnected.
  useEffect(() => {
    if (isMulti) {
      const exists = activeVariants.some(
        (v) => String(v._id) === selectedVariantId &&
          isVariantMappedForSale(product.variantSelector, selectedVariantId),
      );
      // Empty is intentional while a customer edits an incomplete combination.
      if (!exists && selectedVariantId) {
        setSelectedVariantIdState(
          String(getDefaultVariant(activeVariants, product.variantSelector)?._id || ""),
        );
      }
    }
  }, [isMulti, activeVariants, selectedVariantId, product.variantSelector]);

  const setSelectedVariantId = useCallback(
    (variantId: string) => {
      setSelectedVariantIdState(variantId);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (variantId) {
          url.searchParams.set("variant", variantId);
        } else {
          url.searchParams.delete("variant");
        }
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    },
    [],
  );

  const effectivePrice = isMulti
    ? Number(selectedVariant?.price ?? product.price ?? 0)
    : Number(product.price ?? 0);

  const effectiveDiscountPrice = isMulti
    ? selectedVariant
      ? selectedVariant.discountPrice !== undefined &&
      selectedVariant?.discountPrice !== null
      ? Number(selectedVariant.discountPrice)
      : null
      : product.discountPrice !== undefined && product.discountPrice !== null
        ? Number(product.discountPrice)
        : null
    : product.discountPrice !== undefined && product.discountPrice !== null
      ? Number(product.discountPrice)
      : null;

  const finalPrice = effectiveDiscountPrice ?? effectivePrice;

  const effectiveStock = isMulti
    ? Number(selectedVariant?.stock ?? product.stock ?? 0)
    : Number(product.stock ?? 0);

  const effectiveSku =
    (isMulti ? selectedVariant?.sku : null) || product.sku || "";

  const isOutOfStock = effectiveStock <= 0;
  const requiresSelection = isMulti && !selectedVariant;

  const value = useMemo<ProductVariantContextValue>(
    () => ({
      product,
      activeVariants,
      selectedVariantId,
      selectedVariant,
      isMulti,
      effectivePrice,
      effectiveDiscountPrice,
      finalPrice,
      effectiveStock,
      effectiveSku,
      isOutOfStock,
      requiresSelection,
      setSelectedVariantId,
    }),
    [
      product,
      activeVariants,
      selectedVariantId,
      selectedVariant,
      isMulti,
      effectivePrice,
      effectiveDiscountPrice,
      finalPrice,
      effectiveStock,
      effectiveSku,
      isOutOfStock,
      requiresSelection,
      setSelectedVariantId,
    ],
  );

  return (
    <ProductVariantContext.Provider value={value}>
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  const context = useContext(ProductVariantContext);
  if (!context) {
    throw new Error(
      "useProductVariant must be used within a ProductVariantProvider",
    );
  }
  return context;
}
