"use client";

import { Wand2 } from "lucide-react";

import { ProductForm } from "@/types";

interface SeoFieldsProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

export default function SeoFields({ form, updateField }: SeoFieldsProps) {
  const seoTitle = form.seoTitle || "";
  const metaDescription = form.metaDescription || "";

  const generateSeoTitle = () => {
    if (!form.title) return;
    updateField(
      "seoTitle",
      `خرید ${form.title}${form.brand ? ` | ${form.brand}` : ""} | کرمان آتاری`,
    );
  };

  const generateMetaDescription = () => {
    if (!form.title) return;
    const base =
      form.shortDesc?.trim() ||
      `خرید ${form.title} با بهترین قیمت، روش ارسال شفاف و ضمانت اصالت کالا از کرمان آتاری.`;
    updateField("metaDescription", base.slice(0, 160));
  };

  const generateImageAlt = () => {
    if (!form.title) return;
    updateField(
      "mainImageAlt",
      `${form.title}${form.brand ? ` ${form.brand}` : ""} — کرمان آتاری`,
    );
  };

  const titleColor =
    seoTitle.length === 0
      ? "text-slate-500"
      : seoTitle.length > 60
        ? "text-red-400"
        : seoTitle.length < 30
          ? "text-amber-400"
          : "text-emerald-400";

  const metaColor =
    metaDescription.length === 0
      ? "text-slate-500"
      : metaDescription.length > 160
        ? "text-red-400"
        : metaDescription.length < 70
          ? "text-amber-400"
          : "text-emerald-400";

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="relative">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs">عنوان سئو (Title Tag)</label>
          <span className={`text-[10px] ${titleColor}`}>
            {seoTitle.length}/60
          </span>
        </div>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => updateField("seoTitle", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          placeholder="خرید PS5 Slim دیسک‌خور | کنسول پلی‌استیشن 5 | کرمان آتاری"
        />
        <button
          type="button"
          onClick={generateSeoTitle}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-teal-700 transition hover:text-teal-800"
        >
          <Wand2 className="h-3 w-3" />
          تولید خودکار از عنوان محصول
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs">متا توضیحات (Meta Description)</label>
          <span className={`text-[10px] ${metaColor}`}>
            {metaDescription.length}/160
          </span>
        </div>
        <textarea
          rows={3}
          value={metaDescription}
          onChange={(e) => updateField("metaDescription", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          placeholder="خرید PS5 Slim دیسک‌خور با ارسال براساس مقصد، گارانتی سلامت کالا و پشتیبانی واقعی از کرمان آتاری."
        />
        <button
          type="button"
          onClick={generateMetaDescription}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-teal-700 transition hover:text-teal-800"
        >
          <Wand2 className="h-3 w-3" />
          تولید خودکار از توضیح کوتاه
        </button>
      </div>

      <div className="relative">
        <label className="mb-1 block text-xs">ALT تصویر اصلی</label>
        <input
          type="text"
          value={form.mainImageAlt || ""}
          onChange={(e) => updateField("mainImageAlt", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          placeholder="کنسول PS5 Slim دیسک‌خور با دسته DualSense"
        />
        <button
          type="button"
          onClick={generateImageAlt}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-teal-700 transition hover:text-teal-800"
        >
          <Wand2 className="h-3 w-3" />
          تولید خودکار از عنوان و برند
        </button>
      </div>
    </div>
  );
}
