"use client";

import { useEffect, useMemo, useState } from "react";
import RichTextEditor from "../RichTextEditor";
import type { ProductForm, ProductVariant } from "@/types";
import { formatPrice, toPersianDigits } from "@/helpers/Price";
import { Plus, Trash2 } from "lucide-react";

interface BasicInfoFieldsProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const fieldLabels: Record<string, string> = {
  productType: "نوع محصول",
  title: "عنوان محصول",
  slug: "اسلاگ (شناسه یکتا در URL)",
  sku: "کد SKU محصول",
  price: "قیمت (تومان)",
  discountPrice: "قیمت تخفیف (تومان)",
  stock: "موجودی انبار",
  brand: "برند",
  shortDesc: "توضیح کوتاه",
};

const BasicInfoFields = ({ form, updateField }: BasicInfoFieldsProps) => {
  const [isSingleDiscountEnabled, setIsSingleDiscountEnabled] = useState(
    form.discountPrice !== null && form.discountPrice !== undefined,
  );

  useEffect(() => {
    setIsSingleDiscountEnabled(
      form.discountPrice !== null && form.discountPrice !== undefined,
    );
  }, [form.discountPrice]);

  const variants = useMemo(() => form.variants || [], [form.variants]);

  const variantSummary = useMemo(() => {
    const activeVariants = variants.filter((v) => v.isActive !== false);
    const activeCount = activeVariants.length;
    const totalStock = activeVariants.reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0,
    );

    if (activeCount === 0) {
      return {
        activeCount: 0,
        totalStock: 0,
        priceRangeText: "هنوز مدلی فعال نشده است",
      };
    }

    const prices = activeVariants.map(
      (v) => (v.discountPrice !== null && v.discountPrice !== undefined ? v.discountPrice : v.price) || 0,
    );
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const priceRangeText =
      minPrice === maxPrice
        ? `${formatPrice(minPrice)} تومان`
        : `${formatPrice(minPrice)} تا ${formatPrice(maxPrice)} تومان`;

    return {
      activeCount,
      totalStock,
      priceRangeText,
    };
  }, [variants]);

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      title: "",
      sku: "",
      barcode: "",
      price: 0,
      discountPrice: null,
      stock: 0,
      isActive: true,
    };
    updateField("variants", [...variants, newVariant]);
  };

  const handleUpdateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: any,
  ) => {
    const next = [...variants];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    updateField("variants", next);
  };

  const handleRemoveVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    updateField("variants", next);
  };

  return (
    <div className="grid grid-cols-2 gap-5 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 shadow-lg backdrop-blur-md transition-all duration-300">
      {/* Product Type Selector */}
      <div className="col-span-2 relative my-2 w-full">
        <label
          htmlFor="product-productType"
          className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
        >
          {fieldLabels.productType}
        </label>
        <select
          id="product-productType"
          value={form.productType}
          onChange={(e) =>
            updateField(
              "productType",
              e.target.value as ProductForm["productType"],
            )
          }
          className="w-full border-b border-slate-600 bg-inherit py-2 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
        >
          <option value="single" className="bg-slate-900 text-slate-100">
            محصول تکی (Single)
          </option>
          <option value="multi" className="bg-slate-900 text-slate-100">
            محصول چند مدلی / دارای تنوع (Multi-Variant)
          </option>
        </select>
      </div>

      {/* Title */}
      <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
        <label
          htmlFor="product-title"
          className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
        >
          {fieldLabels.title} *
        </label>
        <input
          id="product-title"
          type="text"
          value={form.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="مثلاً کنسول پلی‌استیشن ۵"
          className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Slug */}
      <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
        <label
          htmlFor="product-slug"
          className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
        >
          {fieldLabels.slug} *
        </label>
        <input
          id="product-slug"
          type="text"
          value={form.slug || ""}
          onChange={(e) => updateField("slug", e.target.value)}
          placeholder="مثلاً ps5-standard-edition"
          className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none dir-ltr text-right"
        />
      </div>

      {/* Brand */}
      <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
        <label
          htmlFor="product-brand"
          className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
        >
          {fieldLabels.brand}
        </label>
        <input
          id="product-brand"
          type="text"
          value={form.brand || ""}
          onChange={(e) => updateField("brand", e.target.value)}
          placeholder="مثلاً سونی (Sony)"
          className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Short Description */}
      <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
        <label
          htmlFor="product-shortDesc"
          className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
        >
          {fieldLabels.shortDesc}
        </label>
        <input
          id="product-shortDesc"
          type="text"
          value={form.shortDesc || ""}
          onChange={(e) => updateField("shortDesc", e.target.value)}
          placeholder="خلاصه ویژگی‌های محصول برای پیش‌نمایش"
          className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* ─── SINGLE PRODUCT FIELDS ─── */}
      {form.productType === "single" && (
        <>
          {/* SKU */}
          <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
            <label
              htmlFor="product-sku"
              className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
            >
              {fieldLabels.sku}
            </label>
            <input
              id="product-sku"
              type="text"
              value={form.sku || ""}
              onChange={(e) => updateField("sku", e.target.value)}
              placeholder="کد یکتای انبارداری (اختیاری)"
              className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none dir-ltr text-right"
            />
          </div>

          {/* Price */}
          <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
            <label
              htmlFor="product-price"
              className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
            >
              {fieldLabels.price} *
            </label>
            <input
              id="product-price"
              type="number"
              min="0"
              step="1"
              value={form.price ?? ""}
              onChange={(e) => updateField("price", Math.max(0, Math.floor(Number(e.target.value))))}
              className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Stock */}
          <div className="col-span-2 sm:col-span-1 relative my-2 w-full">
            <label
              htmlFor="product-stock"
              className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
            >
              {fieldLabels.stock} *
            </label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              value={form.stock ?? ""}
              onChange={(e) => updateField("stock", Math.max(0, Math.floor(Number(e.target.value))))}
              className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Discount Toggle & Field */}
          <div className="col-span-2 my-2 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">
                فعال‌سازی قیمت تخفیف‌خورده
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextValue = !isSingleDiscountEnabled;
                  setIsSingleDiscountEnabled(nextValue);
                  if (!nextValue) updateField("discountPrice", null);
                }}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isSingleDiscountEnabled ? "bg-emerald-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    isSingleDiscountEnabled ? "right-0.5" : "right-5"
                  }`}
                />
              </button>
            </div>

            {isSingleDiscountEnabled && (
              <div className="relative mt-4 w-full">
                <label
                  htmlFor="product-discountPrice"
                  className="pointer-events-none absolute -top-4 left-0 text-xs text-slate-400"
                >
                  {fieldLabels.discountPrice} (تومان)
                </label>
                <input
                  id="product-discountPrice"
                  type="number"
                  min="0"
                  max={form.price}
                  step="1"
                  value={form.discountPrice ?? ""}
                  onChange={(e) =>
                    updateField(
                      "discountPrice",
                      e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))),
                    )
                  }
                  className="w-full border-b border-slate-600 bg-inherit py-1 text-sm text-slate-100 transition-colors focus:border-b-2 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── MULTI-VARIANT EDITOR ─── */}
      {form.productType === "multi" && (
        <div className="col-span-2 my-2 rounded-xl border border-indigo-500/30 bg-slate-800/80 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-700 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                مدیریت مدل‌ها / تنوع‌های محصول (Variants)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                موجودی و قیمت کلی محصول به‌صورت خودکار از مدل‌های فعال زیر محاسبه می‌شود.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن مدل
            </button>
          </div>

          {/* Summary Box */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-400">تعداد مدل‌های فعال:</span>
              <strong className="text-sm text-slate-100 mt-0.5">
                {toPersianDigits(variantSummary.activeCount)} مدل فعال
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">موجودی کل انبار:</span>
              <strong className="text-sm text-emerald-400 mt-0.5">
                {toPersianDigits(variantSummary.totalStock)} عدد موجود
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">بازه قیمت مدل‌ها:</span>
              <strong className="text-sm text-indigo-300 mt-0.5">
                {variantSummary.priceRangeText}
              </strong>
            </div>
          </div>

          {/* Variant Items List */}
          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
              هنوز مدلی اضافه نشده است. لطفاً با کلیک روی «افزودن مدل» حداقل یک مدل (مانند ظرفیت یا رنگ) اضافه کنید.
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant._id || index}
                  className={`rounded-xl border p-3 transition ${
                    variant.isActive !== false
                      ? "border-slate-700 bg-slate-900/40"
                      : "border-slate-800 bg-slate-900/20 opacity-70"
                  }`}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Title */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        نام مدل *
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً ۱ ترابایت / سفید"
                        value={variant.title}
                        onChange={(e) =>
                          handleUpdateVariant(index, "title", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        کد SKU
                      </label>
                      <input
                        type="text"
                        placeholder="اختیاری"
                        value={variant.sku || ""}
                        onChange={(e) =>
                          handleUpdateVariant(index, "sku", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    {/* Barcode */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        بارکد
                      </label>
                      <input
                        type="text"
                        placeholder="اختیاری"
                        value={variant.barcode || ""}
                        onChange={(e) =>
                          handleUpdateVariant(index, "barcode", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500 dir-ltr text-right"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        قیمت (تومان) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="قیمت"
                        value={variant.price || ""}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "price",
                            Math.max(0, Math.floor(Number(e.target.value))),
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Discount Price */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        قیمت تخفیف
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="اختیاری"
                        value={variant.discountPrice ?? ""}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "discountPrice",
                            e.target.value === ""
                              ? null
                              : Math.max(0, Math.floor(Number(e.target.value))),
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        موجودی
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="تعداد"
                        value={variant.stock ?? ""}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "stock",
                            Math.max(0, Math.floor(Number(e.target.value))),
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Footer of variant card: Active toggle + Delete */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={variant.isActive !== false}
                        onChange={(e) =>
                          handleUpdateVariant(index, "isActive", e.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-slate-300">
                        {variant.isActive !== false ? "فعال برای فروش" : "غیرفعال"}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 transition py-0.5 px-2 rounded hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف مدل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <RichTextEditor
        className="col-span-2 my-2"
        label="توضیحات محصول"
        value={form.description || ""}
        onChange={(value) => updateField("description", value)}
        placeholder="توضیحات کامل محصول را وارد کنید..."
      />
    </div>
  );
};

export default BasicInfoFields;
