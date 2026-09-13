"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "../RichTextEditor"; // اگر مسیر فرق دارد اصلاح کن
import type { ProductForm } from "@/types"; // اگر تایپ‌ها جای دیگری است اصلاح کن

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
  slug: "اسلاگ",
  price: "قیمت",
  discountPrice: "قیمت تخفیف",
  stock: "موجودی",
  brand: "برند",
  shortDesc: "توضیح کوتاه",
};

const BasicInfoFields = ({ form, updateField }: BasicInfoFieldsProps) => {
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(
    form.discountPrice !== null && form.discountPrice !== undefined,
  );

  useEffect(() => {
    setIsDiscountEnabled(
      form.discountPrice !== null && form.discountPrice !== undefined,
    );
  }, [form.discountPrice]);

  const textFields: (keyof ProductForm)[] = [
    "title",
    "slug",
    "brand",
    "shortDesc",
  ];

  return (
    <div className="grid grid-cols-2 gap-5 rounded-2xl border border-white/30 bg-white/20 p-5 shadow-lg backdrop-blur-md transition-all duration-300">
      <div className="col-span-2 relative my-2 w-full">
        <label
          htmlFor="product-productType"
          className="pointer-events-none absolute -top-4 left-0 text-xs"
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
          className="w-full border-b border-gray-300 bg-inherit py-2 transition-colors focus:border-b-2 focus:border-blue-700 focus:outline-none"
        >
          <option value="single" className="text-black">
            محصول تکی
          </option>
          <option value="multi" className="text-black">
            محصول چند مدلی
          </option>
        </select>
      </div>

      {textFields.map((field) => (
        <div key={field} className="relative my-2 w-full">
          <label
            htmlFor={`product-${String(field)}`}
            className="pointer-events-none absolute -top-4 left-0 text-xs"
          >
            {fieldLabels[String(field)]}
          </label>

          <input
            id={`product-${String(field)}`}
            type="text"
            value={(form[field] as string) || ""}
            onChange={(e) =>
              updateField(field, e.target.value as ProductForm[typeof field])
            }
            className="w-full border-b border-gray-300 bg-inherit py-1 transition-colors focus:border-b-2 focus:border-blue-700 focus:outline-none"
          />
        </div>
      ))}

      <div className="relative my-2 w-full">
        <label
          htmlFor="product-price"
          className="pointer-events-none absolute -top-4 left-0 text-xs"
        >
          {fieldLabels.price}
        </label>

        <input
          id="product-price"
          type="number"
          value={form.price ?? ""}
          onChange={(e) => updateField("price", Number(e.target.value))}
          className="w-full border-b border-gray-300 bg-inherit py-1 transition-colors focus:border-b-2 focus:border-blue-700 focus:outline-none"
        />
      </div>

      {form.productType === "multi" && (
        <div className="col-span-2 my-2 rounded-xl border border-white/30 bg-white/10 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">مدل‌های قابل ساخت</h4>
            <button
              type="button"
              onClick={() =>
                updateField("variants", [
                  ...(form.variants || []),
                  {
                    title: "",
                    sku: "",
                    price: 0,
                    discountPrice: null,
                    stock: 0,
                  },
                ])
              }
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs text-white"
            >
              افزودن مدل
            </button>
          </div>

          <div className="space-y-3">
            {(form.variants || []).map((variant, index) => (
              <div
                key={index}
                className="grid grid-cols-5 gap-2 rounded-lg border border-white/20 p-2"
              >
                <input
                  type="text"
                  placeholder="نام مدل"
                  value={variant.title}
                  onChange={(e) => {
                    const next = [...(form.variants || [])];
                    next[index] = { ...next[index], title: e.target.value };
                    updateField("variants", next);
                  }}
                  className="col-span-2 rounded bg-white/20 px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  placeholder="قیمت"
                  value={variant.price}
                  onChange={(e) => {
                    const next = [...(form.variants || [])];
                    next[index] = {
                      ...next[index],
                      price: Number(e.target.value),
                    };
                    updateField("variants", next);
                  }}
                  className="rounded bg-white/20 px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  placeholder="موجودی"
                  value={variant.stock}
                  onChange={(e) => {
                    const next = [...(form.variants || [])];
                    next[index] = {
                      ...next[index],
                      stock: Number(e.target.value),
                    };
                    updateField("variants", next);
                  }}
                  className="rounded bg-white/20 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = (form.variants || []).filter(
                      (_, i) => i !== index,
                    );
                    updateField("variants", next);
                  }}
                  className="rounded bg-red-500/80 px-2 py-1 text-xs text-white"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative my-2 w-full">
        <label
          htmlFor="product-stock"
          className="pointer-events-none absolute -top-4 left-0 text-xs"
        >
          {fieldLabels.stock}
        </label>

        <input
          id="product-stock"
          type="number"
          value={form.stock ?? ""}
          onChange={(e) => updateField("stock", Number(e.target.value))}
          className="w-full border-b border-gray-300 bg-inherit py-1 transition-colors focus:border-b-2 focus:border-blue-700 focus:outline-none"
        />
      </div>

      <div className="col-span-2 my-2 rounded-xl border border-white/30 bg-white/10 p-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">فعال‌سازی قیمت تخفیف</label>

          <button
            title="button"
            type="button"
            onClick={() => {
              const nextValue = !isDiscountEnabled;
              setIsDiscountEnabled(nextValue);
              if (!nextValue) updateField("discountPrice", null);
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isDiscountEnabled ? "bg-green-500" : "bg-gray-500"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isDiscountEnabled ? "right-0.5" : "right-5"
              }`}
            />
          </button>
        </div>

        {isDiscountEnabled && (
          <div className="relative mt-4 w-full">
            <label
              htmlFor="product-discountPrice"
              className="pointer-events-none absolute -top-4 left-0 text-xs"
            >
              {fieldLabels.discountPrice}
            </label>

            <input
              id="product-discountPrice"
              type="number"
              value={form.discountPrice ?? ""}
              onChange={(e) =>
                updateField(
                  "discountPrice",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="w-full border-b border-gray-300 bg-inherit py-1 transition-colors focus:border-b-2 focus:border-blue-700 focus:outline-none"
            />
          </div>
        )}
      </div>

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
