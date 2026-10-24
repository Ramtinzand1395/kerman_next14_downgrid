"use client";

import { Truck, RotateCcw, Box, Store } from "lucide-react";
import Link from "next/link";
import { Comment, Product } from "@/types";
import AddToCart from "./AddToCart";
import {
  calculateDiscountPercent,
  formatPrice,
  toPersianDigits,
} from "@/helpers/Price";
import AddCommentButton from "./AddCommentButton";
import { useProductVariant } from "./ProductVariantContext";
import CustomVariantSelector from "./CustomVariantSelector";

interface ProductInfoProps {
  product?: Product;
  shippingNotices?: string[];
}

export const ProductInfo = ({ product: propProduct, shippingNotices = [] }: ProductInfoProps) => {
  const {
    product: contextProduct,
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
  } = useProductVariant();

  const product = propProduct || contextProduct;

  const rating = product.comments?.length
    ? product.comments.reduce((t: number, c: Comment) => t + c.rating, 0) /
      product.comments.length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Brand & Category */}
      <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-2">
        {product.brand ? <span>{product.brand}</span> : null}
        <span className="text-gray-300">/</span>
        {product.category?._id && (
          <Link
            href={`/products?category=${product.category._id}`}
            className="hover:underline"
          >
            {product.category.name}
          </Link>
        )}
      </div>

      {/* SKU */}
      {effectiveSku && (
        <span className="text-gray-400 text-sm mb-4 block dir-ltr text-right">
          SKU: {effectiveSku}
        </span>
      )}

      {/* Rating & Reviews */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-0 sm:gap-2 text-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`text-lg ${
                rating >= i ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </span>
          ))}
          <span className="text-gray-500">
            {product.comments?.length ? rating.toFixed(1) : "بدون امتیاز"}
          </span>
          <span className="text-gray-400">
            ({product.comments?.length || 0} نظر)
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
        <AddCommentButton />
      </div>

      {/* Features Summary */}
      {product.shortDesc && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">درباره محصول</h3>
          <p className="text-sm text-gray-600 leading-7">{product.shortDesc}</p>
        </div>
      )}

      {/* Services/Trust Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Truck className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-xs font-medium text-gray-700">ارسال براساس مقصد</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <RotateCcw className="w-5 h-5 text-blue-500 shrink-0" />
          <span className="text-xs font-medium text-gray-700">
            ۷ روز ضمانت بازگشت
          </span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Store className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-xs font-medium text-gray-700">
            تضمین اصالت کالا
          </span>
        </div>
      </div>

      {shippingNotices.length > 0 && (
        <div className="mb-8 space-y-2 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
          {shippingNotices.map((notice) => (
            <p key={notice} className="text-xs leading-6 text-slate-700">{notice}</p>
          ))}
        </div>
      )}

      {/* tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {product.tags.map((tag) => (
            <span
              key={tag._id}
              className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 text-xs rounded-lg"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Price & Variant Selection Box */}
      <div className="mt-auto bg-gray-50 rounded-2xl p-5 border border-gray-100">
        {/* Multi-variant selector chips */}
        {isMulti && product.variantSelector?.enabled ? <CustomVariantSelector /> : null}
        {isMulti && !product.variantSelector?.enabled && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-gray-800">
                انتخاب مدل / ظرفیت:
              </label>
              {selectedVariant && (
                <span className="text-xs font-semibold text-indigo-600">
                  {selectedVariant.title}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((variant) => {
                const isSelected =
                  String(variant._id) === String(selectedVariantId);
                const variantStock = Number(variant.stock || 0);
                const isVariantOutOfStock = variantStock <= 0;
                return (
                  <button
                    key={variant._id}
                    type="button"
                    disabled={isVariantOutOfStock}
                    onClick={() => setSelectedVariantId(String(variant._id))}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs md:text-sm font-medium transition-all ${
                      isSelected
                        ? "border-2 border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm"
                        : isVariantOutOfStock
                          ? "cursor-not-allowed border border-dashed border-gray-200 bg-gray-100 text-gray-400 opacity-60"
                          : "border border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>{variant.title}</span>
                    {isVariantOutOfStock && (
                      <span className="text-[10px] text-red-500 font-normal">
                        (ناموجود)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="flex justify-between items-center mb-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              requiresSelection
                ? "text-amber-700 bg-amber-100"
                : !isOutOfStock
                ? "text-emerald-700 bg-emerald-100"
                : "text-red-700 bg-red-100"
            }`}
          >
            <Box className="w-4 h-4" />
            <span className="text-sm font-medium">
              {requiresSelection
                ? "گزینه‌های محصول را انتخاب کنید"
                : !isOutOfStock
                ? `موجود در انبار (${toPersianDigits(effectiveStock)} عدد)`
                : "ناموجود در انبار"}
            </span>
          </div>
        </div>

        {/* Pricing and AddToCart */}
        <div className="flex items-end justify-between gap-4">
          <div>
            {effectiveDiscountPrice !== null ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(effectivePrice)}
                  </span>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {toPersianDigits(
                      calculateDiscountPercent(
                        effectivePrice,
                        effectiveDiscountPrice,
                      ),
                    )}
                    %
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl md:text-3xl font-bold text-gray-900">
                    {formatPrice(finalPrice)}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    تومان
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-2xl md:text-3xl font-bold text-gray-900">
                  {formatPrice(finalPrice)}
                </span>
                <span className="text-sm text-gray-500 font-medium">تومان</span>
              </div>
            )}
          </div>
          <AddToCart product={product} selectedVariantId={selectedVariantId} />
        </div>
      </div>
    </div>
  );
};
