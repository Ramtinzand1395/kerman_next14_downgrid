"use client";

import MoneyInput from "@/app/components/forms/MoneyInput";
import { useEffect, useMemo, useState } from "react";
import RichTextEditor from "../RichTextEditor";
import type { ProductForm, ProductVariant } from "@/types";
import { formatPrice, toPersianDigits } from "@/helpers/Price";
import { Plus, Trash2 } from "lucide-react";

interface BasicInfoFieldsProps {
  form: ProductForm;
  purchasePriceRequired: boolean;
  variantPurchasePriceRequired: (variant: ProductVariant) => boolean;
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
  barcode: "بارکد محصول",
  price: "قیمت (تومان)",
  discountPrice: "قیمت تخفیف (تومان)",
  stock: "موجودی انبار",
  brand: "برند",
  shortDesc: "توضیح کوتاه",
};

function PurchasePriceField({
  value,
  required,
  onChange,
}: {
  value?: number | null;
  required: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      <span className="mb-1 block">قیمت خرید (تومان){required ? " *" : ""}</span>
      <MoneyInput
        min="0"
        max={Number.MAX_SAFE_INTEGER}
        step="1"
        aria-required={required}
        value={value ?? ""}
        onValueChange={(event) => onChange(event === "" ? null : Number(event))}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
      />
    </label>
  );
}

const BasicInfoFields = ({
  form,
  updateField,
  purchasePriceRequired,
  variantPurchasePriceRequired,
}: BasicInfoFieldsProps) => {
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
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const newVariant: ProductVariant = {
      _id: Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""),
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
    const variantId = String(variants[index]?._id || "");
    const isMapped = form.variantSelector?.mappings.some(
      (mapping) => String(mapping.variantId) === variantId,
    );
    if (
      isMapped &&
      !window.confirm("این مدل در انتخاب‌گر سفارشی استفاده شده است. مدل و اتصال آن حذف شوند؟")
    ) return;
    const next = variants.filter((_, i) => i !== index);
    updateField("variants", next);
    if (isMapped && form.variantSelector) {
      updateField("variantSelector", {
        ...form.variantSelector,
        mappings: form.variantSelector.mappings.filter(
          (mapping) => String(mapping.variantId) !== variantId,
        ),
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
      <div className="space-y-3 sm:col-span-2">
        <p className="text-sm font-semibold text-slate-800">نوع محصول</p>
        <div role="group" aria-label="نوع محصول" className="grid grid-cols-2 gap-3">
          {([
            { value: "single", label: "محصول تکی", help: "یک قیمت و یک موجودی" },
            { value: "multi", label: "چندمدلی", help: "چند رنگ، ظرفیت یا مدل" },
          ] as const).map(option => (
            <button key={option.value} type="button"
              disabled={form.condition === "used" && option.value === "multi"}
              aria-pressed={form.productType === option.value}
              onClick={() => updateField("productType", option.value)}
              className={"rounded-xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-40 " +
                (form.productType === option.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50 hover:border-slate-500")}>
              <span className="block text-sm font-bold text-slate-900">{option.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{option.help}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            <input type="checkbox" className="h-4 w-4 accent-teal-700"
              disabled={form.condition === "used"}
              checked={!!form.isDigital}
              onChange={event => updateField("isDigital", event.target.checked)} />
            <span><strong className="block text-sm">محصول دیجیتال</strong><span className="mt-1 block text-slate-500">بدون ارسال فیزیکی</span></span>
          </label>
          {form.isDigital && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={!!form.isOnlineGame}
              onChange={event => updateField("isOnlineGame", event.target.checked)} />
            <span><strong className="block text-sm">بازی آنلاین اکانتی</strong><span className="mt-1 block text-slate-500">تحویل اطلاعات اکانت</span></span>
          </label>}
        </div>
      </div>

      {/* Title */}
      <div className="relative w-full sm:col-span-1">
        <label
          htmlFor="product-title"
          className="mb-2 block text-xs font-semibold text-slate-700"
        >
          {fieldLabels.title} *
        </label>
        <input
          id="product-title"
          type="text"
          value={form.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="مثلاً کنسول پلی‌استیشن ۵"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
        />
      </div>

      {/* Slug */}
      <div className="relative w-full sm:col-span-1">
        <label
          htmlFor="product-slug"
          className="mb-2 block text-xs font-semibold text-slate-700"
        >
          {fieldLabels.slug} *
        </label>
        <input
          id="product-slug"
          type="text"
          value={form.slug || ""}
          onChange={(e) => updateField("slug", e.target.value)}
          placeholder="مثلاً ps5-standard-edition"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dir-ltr text-right"
        />
        <button type="button" onClick={() => {
          const suggested = (form.title || "").trim().toLowerCase()
            .replace(/[^\w\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "");
          if (suggested) updateField("slug", suggested);
        }} className="mt-2 text-xs font-semibold text-teal-700 transition hover:text-teal-800">
          ساخت اسلاگ از نام محصول
        </button>
      </div>

      {/* Brand */}
      <div className="relative w-full sm:col-span-1">
        <label
          htmlFor="product-brand"
          className="mb-2 block text-xs font-semibold text-slate-700"
        >
          {fieldLabels.brand}
        </label>
        <input
          id="product-brand"
          type="text"
          value={form.brand || ""}
          onChange={(e) => updateField("brand", e.target.value)}
          placeholder="مثلاً سونی (Sony)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
        />
      </div>

      {/* Short Description */}
      <div className="relative w-full sm:col-span-1">
        <label
          htmlFor="product-shortDesc"
          className="mb-2 block text-xs font-semibold text-slate-700"
        >
          {fieldLabels.shortDesc}
        </label>
        <input
          id="product-shortDesc"
          type="text"
          value={form.shortDesc || ""}
          onChange={(e) => updateField("shortDesc", e.target.value)}
          placeholder="خلاصه ویژگی‌های محصول برای پیش‌نمایش"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
        />
      </div>

      {/* ─── SINGLE PRODUCT FIELDS ─── */}
      {form.productType === "single" && (
        <>
          {/* SKU */}
          <div className="relative w-full sm:col-span-1">
            <label
              htmlFor="product-sku"
              className="mb-2 block text-xs font-semibold text-slate-700"
            >
              {fieldLabels.sku}
            </label>
            <input
              id="product-sku"
              type="text"
              value={form.sku || ""}
              onChange={(e) => updateField("sku", e.target.value)}
              placeholder="کد یکتای انبارداری (اختیاری)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dir-ltr text-right"
            />
          </div>

          {/* Barcode */}
          <div className="relative w-full sm:col-span-1">
            <label
              htmlFor="product-barcode"
              className="mb-2 block text-xs font-semibold text-slate-700"
            >
              {fieldLabels.barcode}
            </label>
            <input
              id="product-barcode"
              type="text"
              inputMode="numeric"
              value={form.barcode || ""}
              onChange={(e) => updateField("barcode", e.target.value)}
              placeholder="بارکد یکتای محصول تکی (اختیاری)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dir-ltr text-right"
            />
          </div>

          {/* Price */}
          <div className="relative w-full sm:col-span-1">
            <label
              htmlFor="product-price"
              className="mb-2 block text-xs font-semibold text-slate-700"
            >
              {fieldLabels.price} *
            </label>
            <MoneyInput
              id="product-price"
              min="0"
              step="1"
              value={form.price ?? ""}
              onValueChange={(e) => updateField("price", Math.max(0, Math.floor(Number(e))))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
            />
          </div>

          <div className="sm:col-span-1">
            <PurchasePriceField
              value={form.purchasePrice}
              required={purchasePriceRequired}
              onChange={(value) => updateField("purchasePrice", value)}
            />
          </div>

          {/* Stock */}
          <div className="relative w-full sm:col-span-1">
            <label
              htmlFor="product-stock"
              className="mb-2 block text-xs font-semibold text-slate-700"
            >
              {fieldLabels.stock} *
            </label>
            <input
              id="product-stock"
              type="number"
              min="0"
              max={form.condition === "used" ? 1 : undefined}
              step="1"
              value={form.stock ?? ""}
              onChange={(e) => updateField("stock", Math.min(form.condition === "used" ? 1 : Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(Number(e.target.value)))) )}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
            />
          </div>

          {/* Discount Toggle & Field */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-800">
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
                  isSingleDiscountEnabled ? "bg-emerald-600" : "bg-slate-200"
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
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  {fieldLabels.discountPrice} (تومان)
                </label>
                <MoneyInput
                  id="product-discountPrice"
                  min="0"
                  max={form.price}
                  step="1"
                  value={form.discountPrice ?? ""}
                  onValueChange={(e) =>
                    updateField(
                      "discountPrice",
                      e === "" ? null : Math.max(0, Math.floor(Number(e))),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── MULTI-VARIANT EDITOR ─── */}
      {form.productType === "multi" && (
        <div className="rounded-xl border border-teal-200 bg-slate-50 p-4 sm:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                مدیریت مدل‌ها / تنوع‌های محصول (Variants)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                موجودی و قیمت کلی محصول به‌صورت خودکار از مدل‌های فعال زیر محاسبه می‌شود.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن مدل
            </button>
          </div>

          {/* Summary Box */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500">تعداد مدل‌های فعال:</span>
              <strong className="text-sm text-slate-900 mt-0.5">
                {toPersianDigits(variantSummary.activeCount)} مدل فعال
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">موجودی کل انبار:</span>
              <strong className="text-sm text-emerald-400 mt-0.5">
                {toPersianDigits(variantSummary.totalStock)} عدد موجود
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">بازه قیمت مدل‌ها:</span>
              <strong className="text-sm text-teal-700 mt-0.5">
                {variantSummary.priceRangeText}
              </strong>
            </div>
          </div>

          {/* Variant Items List */}
          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              هنوز مدلی اضافه نشده است. لطفاً با کلیک روی «افزودن مدل» حداقل یک مدل (مانند ظرفیت یا رنگ) اضافه کنید.
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant._id || index}
                  className={`rounded-xl border p-3 transition ${
                    variant.isActive !== false
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-100 bg-slate-100 opacity-70"
                  }`}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Title */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        نام مدل *
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً ۱ ترابایت / سفید"
                        value={variant.title}
                        onChange={(e) =>
                          handleUpdateVariant(index, "title", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                      />
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        کد SKU
                      </label>
                      <input
                        type="text"
                        placeholder="اختیاری"
                        value={variant.sku || ""}
                        onChange={(e) =>
                          handleUpdateVariant(index, "sku", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600 dir-ltr text-right"
                      />
                    </div>

                    {/* Barcode */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        بارکد
                      </label>
                      <input
                        type="text"
                        placeholder="اختیاری"
                        value={variant.barcode || ""}
                        onChange={(e) =>
                          handleUpdateVariant(index, "barcode", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600 dir-ltr text-right"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        قیمت (تومان) *
                      </label>
                      <MoneyInput
                        min="0"
                        step="1"
                        placeholder="قیمت"
                        value={variant.price || ""}
                        onValueChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "price",
                            Math.max(0, Math.floor(Number(e))),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                      />
                    </div>

                    <PurchasePriceField
                      value={variant.purchasePrice}
                      required={variantPurchasePriceRequired(variant)}
                      onChange={(value) => handleUpdateVariant(index, "purchasePrice", value)}
                    />

                    {/* Discount Price */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        قیمت تخفیف
                      </label>
                      <MoneyInput
                        min="0"
                        step="1"
                        placeholder="اختیاری"
                        value={variant.discountPrice ?? ""}
                        onValueChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "discountPrice",
                            e === ""
                              ? null
                              : Math.max(0, Math.floor(Number(e))),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
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
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  {/* Footer of variant card: Active toggle + Delete */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={variant.isActive !== false}
                        onChange={(e) =>
                          handleUpdateVariant(index, "isActive", e.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border-slate-200 text-teal-700 focus:ring-0"
                      />
                      <span className="text-slate-700">
                        {variant.isActive !== false ? "فعال برای فروش" : "غیرفعال"}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-700 transition py-0.5 px-2 rounded hover:bg-rose-950/40"
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
        className="sm:col-span-2"
        label="توضیحات محصول"
        value={form.description || ""}
        onChange={(value) => updateField("description", value)}
        placeholder="توضیحات کامل محصول را وارد کنید..."
      />
    </div>
  );
};

export default BasicInfoFields;
