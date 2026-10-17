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
  setSelectedVariantId: (variantId: string) => void;
}

const ProductVariantContext = createContext<
  ProductVariantContextValue | undefined
>(undefined);

function resolveDefaultVariantId(
  variants: ProductVariant[],
  defaultVariantId?: string | null,
  preferredVariantId?: string,
): string {
  if (variants.length === 0) return "";

  // 1. Preferred (from URL) if active
  if (preferredVariantId) {
    const match = variants.find(
      (v) => String(v._id) === String(preferredVariantId),
    );
    if (match) return String(match._id);
  }

  // 2. defaultVariantId if in-stock
  if (defaultVariantId) {
    const defaultVar = variants.find(
      (v) => String(v._id) === String(defaultVariantId),
    );
    if (defaultVar && Number(defaultVar.stock || 0) > 0) {
      return String(defaultVar._id);
    }
  }

  // 3. First active variant with stock > 0
  const firstInStock = variants.find((v) => Number(v.stock || 0) > 0);
  if (firstInStock) {
    return String(firstInStock._id);
  }

  // 4. defaultVariantId (even if out of stock)
  if (defaultVariantId) {
    const defaultVar = variants.find(
      (v) => String(v._id) === String(defaultVariantId),
    );
    if (defaultVar) return String(defaultVar._id);
  }

  // 5. First active variant
  return String(variants[0]._id);
}

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
    return resolveDefaultVariantId(
      activeVariants,
      product.defaultVariantId,
      initialVariantId,
    );
  });

  const selectedVariant = useMemo(() => {
    if (!isMulti) return undefined;
    return activeVariants.find(
      (v) => String(v._id) === String(selectedVariantId),
    );
  }, [isMulti, activeVariants, selectedVariantId]);

  // Synchronize selection if variants change or initial is passed
  useEffect(() => {
    if (isMulti) {
      const exists = activeVariants.some(
        (v) => String(v._id) === String(selectedVariantId),
      );
      if (!exists) {
        const nextId = resolveDefaultVariantId(
          activeVariants,
          product.defaultVariantId,
          initialVariantId,
        );
        setSelectedVariantIdState(nextId);
      }
    }
  }, [isMulti, activeVariants, selectedVariantId, product.defaultVariantId, initialVariantId]);

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
    ? Number(selectedVariant?.price ?? 0)
    : Number(product.price ?? 0);

  const effectiveDiscountPrice = isMulti
    ? selectedVariant?.discountPrice !== undefined &&
      selectedVariant?.discountPrice !== null
      ? Number(selectedVariant.discountPrice)
      : null
    : product.discountPrice !== undefined && product.discountPrice !== null
      ? Number(product.discountPrice)
      : null;

  const finalPrice = effectiveDiscountPrice ?? effectivePrice;

  const effectiveStock = isMulti
    ? Number(selectedVariant?.stock ?? 0)
    : Number(product.stock ?? 0);

  const effectiveSku =
    (isMulti ? selectedVariant?.sku : null) || product.sku || "";

  const isOutOfStock = effectiveStock <= 0;

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
