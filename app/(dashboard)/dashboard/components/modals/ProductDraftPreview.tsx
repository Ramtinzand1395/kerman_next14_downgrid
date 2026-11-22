"use client";

import { useState } from "react";
import { Eye, ImageOff, Package, ShieldCheck } from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import type { ProductForm } from "@/types";

type Props = {
  form: ProductForm;
  categoryName?: string;
  tagNames?: string[];
};

const toman = (amount: number) => `${Math.max(0, amount).toLocaleString("fa-IR")} تومان`;
const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

export default function ProductDraftPreview({ form, categoryName, tagNames = [] }: Props) {
  const [view, setView] = useState<"page" | "card">("page");
  const variants = form.productType === "multi" ? form.variants.filter((variant) => variant.isActive !== false) : [];
  const price = form.productType === "single" ? form.price : variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  const effectivePrice = form.productType === "single" ? form.discountPrice ?? price : variants.length
    ? Math.min(...variants.map((v) => v.discountPrice ?? v.price)) : price;
  const stock = form.productType === "single" ? form.stock : variants.reduce((sum, v) => sum + v.stock, 0);
  const hasDiscount = effectivePrice < price;
  const media = [form.mainImage, ...form.galleryImages.map((image) => image.url)].filter(Boolean);
  const summary = plainText(form.shortDesc || form.description || "");
  const report = form.usedConsole;
  const isUsed = form.condition === "used";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm leading-7 text-teal-800">
        <p className="flex items-center gap-2 font-bold"><Eye className="h-4 w-4" /> پیش‌نمایش قبل از انتشار</p>
        <p className="mt-1 text-xs">این فقط شبیه‌سازی صفحه مشتری با داده‌های فعلی فرم است؛ هیچ محصولی منتشر نمی‌شود و امکان خرید وجود ندارد. ظاهر دقیق در سایت ممکن است کمی متفاوت باشد.</p>
      </div>

      <div role="tablist" aria-label="حالت پیش‌نمایش" className="flex gap-2">
        <button type="button" role="tab" aria-selected={view === "page"} onClick={() => setView("page")}
          className={`rounded-lg border px-4 py-2 text-sm font-bold ${view === "page" ? "border-teal-300 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600"}`}>صفحه محصول</button>
        <button type="button" role="tab" aria-selected={view === "card"} onClick={() => setView("card")}
          className={`rounded-lg border px-4 py-2 text-sm font-bold ${view === "card" ? "border-teal-300 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600"}`}>کارت محصول</button>
      </div>

      {view === "card" ? (
        <div role="tabpanel" className="max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative flex aspect-square items-center justify-center bg-slate-50">
            {form.mainImage ? <ProductImage src={form.mainImage} alt={form.mainImageAlt || form.title || "تصویر محصول"} width={520} height={520} className="h-full w-full object-contain" /> : <ImageOff className="h-12 w-12 text-slate-400" />}
            {isUsed && <span className="absolute right-3 top-3 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">کارکرده</span>}
          </div>
          <div className="space-y-2 p-4">
            <p className="text-xs text-slate-500">{categoryName || "دسته‌بندی انتخاب نشده"}</p>
            <p className="min-h-12 text-base font-black leading-6 text-slate-900">{form.title || "عنوان محصول هنوز وارد نشده"}</p>
            <p className="text-sm font-black text-teal-700">{toman(effectivePrice)}</p>
            {hasDiscount && <p className="text-xs text-slate-500 line-through">{toman(price)}</p>}
            <p className="text-xs text-slate-500">{stock > 0 ? "موجود در انبار" : "ناموجود"}</p>
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="text-xs text-slate-500">کرمان آتاری / {categoryName || "بدون دسته‌بندی"} / {form.title || "محصول جدید"}</div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                {form.mainImage ? <ProductImage src={form.mainImage} alt={form.mainImageAlt || form.title || "تصویر محصول"} width={640} height={640} className="h-full w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-slate-500"><ImageOff className="h-11 w-11" /><p className="text-xs">عکس اصلی هنوز ثبت نشده</p></div>}
              </div>
              {media.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{media.slice(0, 8).map((url, index) => <div key={url + index} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><ProductImage src={url} alt={`تصویر ${index + 1}`} width={96} height={96} className="h-full w-full object-contain" /></div>)}</div>}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {isUsed && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">کنسول کارکرده</span>}
                {form.isDigital && <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800">محصول دیجیتال</span>}
              </div>
              <h3 className="text-xl font-black leading-8 text-slate-900">{form.title?.trim() || "عنوان محصول هنوز وارد نشده"}</h3>
              {form.brand && <p className="text-xs text-slate-500">برند: {form.brand}</p>}
              {summary && <p className="text-sm leading-7 text-slate-700">{summary.slice(0, 450)}</p>}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xl font-black text-teal-700">{toman(effectivePrice)}</p>
                {hasDiscount && <p className="mt-1 text-xs text-slate-500 line-through">{toman(price)}</p>}
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><Package className="h-4 w-4" /> {stock > 0 ? `${stock.toLocaleString("fa-IR")} عدد موجود` : "ناموجود"}</p>
              </div>
              {form.productType === "multi" && variants.length > 0 && <div className="space-y-2"><p className="text-sm font-bold">مدل‌های محصول</p><div className="flex flex-wrap gap-2">{variants.map((v, index) => <span key={v._id || index} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">{v.title}</span>)}</div></div>}
              {tagNames.length > 0 && <p className="text-xs text-slate-500">برچسب‌ها: {tagNames.join("، ")}</p>}
              <button type="button" disabled aria-label="افزودن به سبد در پیش‌نمایش غیرفعال است" className="w-full cursor-not-allowed rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white opacity-60">افزودن به سبد (فقط پیش‌نمایش)</button>
            </div>
          </div>
          {isUsed && <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-5 w-5 text-teal-700" /> گزارش وضعیت همین دستگاه</h4>
            <p className="text-sm text-slate-700">مدل: {report?.model || "هنوز ثبت نشده"}</p>
            <p className="text-sm text-slate-700">وضعیت ظاهری: {report?.appearance || "هنوز ثبت نشده"}</p>
            <p className="text-sm text-slate-700">سابقه تعمیر: {report?.repairHistory || "هنوز ثبت نشده"}</p>
            <p className="text-sm text-slate-700">لوازم همراه: {report?.accessories || "هنوز ثبت نشده"}</p>
            <p className="text-sm text-slate-700">مهلت تست: {report?.terms || "هنوز ثبت نشده"}</p>
            <div className="grid gap-2 sm:grid-cols-2">{Object.entries(report?.checks || {}).map(([label, status]) => <p key={label} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">{label}: <strong>{status}</strong></p>)}</div>
          </section>}
          {form.specifications.length > 0 && <section className="space-y-3">
            <h4 className="text-base font-bold">مشخصات فنی</h4>
            {form.specifications.map((group, index) => <div key={index} className="rounded-xl border border-slate-200 p-3"><h5 className="text-sm font-bold">{group.title}</h5>{group.items.map((item, i) => <div key={i} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-xs"><span className="text-slate-500">{item.key}</span><span>{item.value}</span></div>)}</div>)}
          </section>}
          {form.faqs.length > 0 && <section className="space-y-2"><h4 className="text-base font-bold">سوالات متداول</h4>{form.faqs.map((item, index) => <div key={index} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{item.question}</strong><p className="mt-2 text-xs text-slate-600">{item.answer}</p></div>)}</section>}
        </div>
      )}
    </div>
  );
}
