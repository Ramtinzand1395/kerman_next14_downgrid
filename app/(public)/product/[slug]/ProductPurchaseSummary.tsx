"use client";

import React from "react";
import { useProductVariant } from "./ProductVariantContext";
import { formatPrice, toPersianDigits } from "@/helpers/Price";
import AddToCart from "./AddToCart";

export default function ProductPurchaseSummary() {
  const {
    product,
    selectedVariant,
    selectedVariantId,
    isMulti,
    finalPrice,
    effectiveStock,
    effectiveSku,
    isOutOfStock,
    requiresSelection,
  } = useProductVariant();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
        خلاصه خرید
      </h2>

      <ul className="space-y-3 text-sm text-zinc-700">
        {isMulti && selectedVariant && (
          <li className="flex items-center justify-between">
            <span className="text-zinc-500">مدل انتخابی</span>
            <span className="font-semibold text-zinc-900 text-left line-clamp-1 max-w-[150px]">
              {selectedVariant.title}
            </span>
          </li>
        )}

        {isMulti && product.variantSelector?.enabled && selectedVariantId
          ? product.variantSelector.groups
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((group) => {
                const mapping = product.variantSelector?.mappings.find(
                  (item) => String(item.variantId) === String(selectedVariantId),
                );
                const option = group.options.find(
                  (item) => item.id === mapping?.optionIds[group.id],
                );
                return option ? (
                  <li key={group.id} className="flex items-center justify-between">
                    <span className="text-zinc-500">{group.label}</span>
                    <span className="font-semibold text-zinc-900">{option.label}</span>
                  </li>
                ) : null;
              })
          : null}

        <li className="flex items-center justify-between">
          <span className="text-zinc-500">قیمت نهایی</span>
          <strong className="text-zinc-900 font-bold">
            {formatPrice(finalPrice)} تومان
          </strong>
        </li>

        <li className="flex items-center justify-between">
          <span className="text-zinc-500">وضعیت موجودی</span>
          <span
            className={`font-medium ${
              requiresSelection
                ? "text-amber-700"
                : isOutOfStock
                  ? "text-red-600 font-bold"
                  : "text-emerald-700"
            }`}
          >
            {requiresSelection
              ? "منتظر انتخاب"
              : isOutOfStock
              ? "ناموجود"
              : `${toPersianDigits(effectiveStock)} عدد`}
          </span>
        </li>

        {effectiveSku && (
          <li className="flex items-center justify-between">
            <span className="text-zinc-500">شناسه کالا (SKU)</span>
            <span className="font-mono text-xs text-zinc-600 dir-ltr">
              {effectiveSku}
            </span>
          </li>
        )}

        <li className="flex items-center justify-between">
          <span className="text-zinc-500">برند</span>
          <span className="font-medium text-zinc-800">
            {product.brand || "متفرقه"}
          </span>
        </li>
      </ul>

      <div className="pt-2 border-t border-zinc-100">
        <AddToCart product={product} selectedVariantId={selectedVariantId} />
      </div>
    </div>
  );
}
