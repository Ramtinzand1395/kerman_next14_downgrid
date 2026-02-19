"use client";

import { ProductForm } from "@/types";

interface SeoFieldsProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
}

export default function SeoFields({ form, updateField }: SeoFieldsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/30 bg-white/20 p-5 shadow-lg backdrop-blur-md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative">
          <input
            type="text"
            value={form.seoTitle || ""}
            onChange={(e) => updateField("seoTitle", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
          />
          <label className="mb-1 block text-xs">عنوان سئو (Title Tag)</label>
        </div>

        <div className="relative">
          <input
            type="text"
            value={form.mainImageAlt || ""}
            onChange={(e) => updateField("mainImageAlt", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
          />
          <label className="mb-1 block text-xs">ALT تصویر اصلی</label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs">متا توضیحات (حداکثر 160 کاراکتر)</label>
        <textarea
          rows={3}
          value={form.metaDescription || ""}
          onChange={(e) => updateField("metaDescription", e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs">راهنمای انتخاب مدل</label>
        <textarea
          rows={3}
          value={form.modelGuide || ""}
          onChange={(e) => updateField("modelGuide", e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs">مقایسه با مدل مشابه</label>
        <textarea
          rows={3}
          value={form.compareText || ""}
          onChange={(e) => updateField("compareText", e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-inherit px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
        />
      </div>
    </div>
  );
}
