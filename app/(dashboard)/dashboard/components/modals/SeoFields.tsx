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
      `خرید ${form.title} با بهترین قیمت، ارسال سریع و ضمانت اصالت کالا از کرمان آتاری.`;
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
      ? "text-slate-400"
      : seoTitle.length > 60
        ? "text-red-400"
        : seoTitle.length < 30
          ? "text-amber-400"
          : "text-emerald-400";

  const metaColor =
    metaDescription.length === 0
      ? "text-slate-400"
      : metaDescription.length > 160
        ? "text-red-400"
        : metaDescription.length < 70
          ? "text-amber-400"
          : "text-emerald-400";

  return (
    <div className="space-y-4 rounded-2xl border border-white/30 bg-white/20 p-5 shadow-lg backdrop-blur-md">
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
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
          placeholder="خرید PS5 Slim دیسک‌خور | کنسول پلی‌استیشن 5 | کرمان آتاری"
        />
        <button
          type="button"
          onClick={generateSeoTitle}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-blue-300 transition hover:text-blue-200"
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
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
          placeholder="خرید PS5 Slim دیسک‌خور با ارسال سریع در کرمان، گارانتی سلامت کالا، پشتیبانی واقعی. بهترین قیمت و موجودی از کرمان آتاری."
        />
        <button
          type="button"
          onClick={generateMetaDescription}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-blue-300 transition hover:text-blue-200"
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
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
          placeholder="کنسول PS5 Slim دیسک‌خور با دسته DualSense"
        />
        <button
          type="button"
          onClick={generateImageAlt}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-blue-300 transition hover:text-blue-200"
        >
          <Wand2 className="h-3 w-3" />
          تولید خودکار از عنوان و برند
        </button>
      </div>
    </div>
  );
}
