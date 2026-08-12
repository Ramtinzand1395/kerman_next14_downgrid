"use client";

import { CheckCircle2, AlertTriangle, XCircle, Search } from "lucide-react";

import { ProductForm } from "@/types";

interface SeoCheck {
  label: string;
  status: "good" | "warn" | "bad";
  message: string;
}

interface SeoAnalyzerProps {
  form: ProductForm;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const SeoAnalyzer = ({ form }: SeoAnalyzerProps) => {
  const title = (form.seoTitle || form.title || "").trim();
  const metaDescription = (form.metaDescription || form.shortDesc || "").trim();
  const slug = (form.slug || "").trim();
  const descriptionText = stripHtml(form.description || "");
  const mainImageAlt = (form.mainImageAlt || "").trim();
  const focusKeyword = (form.title || "").trim();

  const titleLength = title.length;
  const metaLength = metaDescription.length;

  const keywordInTitle =
    focusKeyword.length > 0 &&
    title.toLowerCase().includes(focusKeyword.toLowerCase().split(" ")[0]);
  const keywordInMeta =
    focusKeyword.length > 0 &&
    metaDescription
      .toLowerCase()
      .includes(focusKeyword.toLowerCase().split(" ")[0]);
  const keywordInSlug =
    focusKeyword.length > 0 && slug.length > 0;

  const checks: SeoCheck[] = [
    {
      label: "عنوان سئو",
      status:
        titleLength === 0 ? "bad" : titleLength > 60 ? "warn" : titleLength < 30 ? "warn" : "good",
      message:
        titleLength === 0
          ? "عنوان سئو وارد نشده است"
          : titleLength > 60
            ? `عنوان طولانی است (${titleLength} کاراکتر) — حداکثر ۶۰ کاراکتر`
            : titleLength < 30
              ? `عنوان کوتاه است (${titleLength} کاراکتر) — بین ۳۰ تا ۶۰ کاراکتر ایده‌آل است`
              : `طول عنوان مناسب است (${titleLength} کاراکتر)`,
    },
    {
      label: "کلمه کلیدی در عنوان",
      status: keywordInTitle ? "good" : "warn",
      message: keywordInTitle
        ? "کلمه کلیدی در عنوان وجود دارد"
        : "بهتر است نام محصول در عنوان سئو باشد",
    },
    {
      label: "متا توضیحات",
      status:
        metaLength === 0 ? "bad" : metaLength > 160 ? "warn" : metaLength < 70 ? "warn" : "good",
      message:
        metaLength === 0
          ? "متا توضیحات وارد نشده است"
          : metaLength > 160
            ? `متا توضیحات طولانی است (${metaLength} کاراکتر) — حداکثر ۱۶۰ کاراکتر`
            : metaLength < 70
              ? `متا توضیحات کوتاه است (${metaLength} کاراکتر) — بین ۷۰ تا ۱۶۰ ایده‌آل است`
              : `طول متا توضیحات مناسب است (${metaLength} کاراکتر)`,
    },
    {
      label: "کلمه کلیدی در متا توضیحات",
      status: keywordInMeta ? "good" : "warn",
      message: keywordInMeta
        ? "کلمه کلیدی در متا توضیحات وجود دارد"
        : "بهتر است نام محصول در متا توضیحات باشد",
    },
    {
      label: "اسلاگ (URL)",
      status: slug.length === 0 ? "bad" : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? "good" : "warn",
      message:
        slug.length === 0
          ? "اسلاگ وارد نشده است"
          : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
            ? "اسلاگ استاندارد است"
            : "اسلاگ بهتر است فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد",
    },
    {
      label: "توضیحات محصول",
      status:
        descriptionText.length === 0 ? "bad" : descriptionText.length < 200 ? "warn" : "good",
      message:
        descriptionText.length === 0
          ? "توضیحات محصول خالی است"
          : descriptionText.length < 200
            ? `توضیحات کوتاه است (${descriptionText.length} کاراکتر) — حداقل ۳۰۰ کاراکتر توصیه می‌شود`
            : `طول توضیحات مناسب است (${descriptionText.length} کاراکتر)`,
    },
    {
      label: "ALT تصویر اصلی",
      status: !form.mainImage ? "warn" : mainImageAlt.length === 0 ? "bad" : "good",
      message: !form.mainImage
        ? "تصویر اصلی آپلود نشده است"
        : mainImageAlt.length === 0
          ? "متن ALT تصویر اصلی وارد نشده است"
          : "متن ALT تصویر اصلی مناسب است",
    },
    {
      label: "دسته‌بندی",
      status: form.category ? "good" : "bad",
      message: form.category ? "دسته‌بندی انتخاب شده است" : "دسته‌بندی انتخاب نشده است",
    },
    {
      label: "توضیح کوتاه",
      status: (form.shortDesc || "").trim().length > 0 ? "good" : "warn",
      message:
        (form.shortDesc || "").trim().length > 0
          ? "توضیح کوتاه وارد شده است"
          : "توضیح کوتاه خالی است — در صورت نبود متا توضیحات از آن استفاده می‌شود",
    },
  ];

  const goodCount = checks.filter((c) => c.status === "good").length;
  const score = Math.round((goodCount / checks.length) * 100);

  const statusIcon = (status: SeoCheck["status"]) =>
    status === "good" ? (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
    ) : status === "warn" ? (
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
    ) : (
      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
    );

  const canonicalUrl = `https://kermanatari.ir/product/${slug || "product-slug"}`;

  return (
    <div className="space-y-4">
      {/* Google SERP Preview */}
      <div className="rounded-xl border border-white/30 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Search className="h-3.5 w-3.5" />
          پیش‌نمایش در نتایج گوگل
        </div>
        <div className="space-y-1" dir="rtl">
          <p className="truncate text-sm text-emerald-700" dir="ltr">
            {canonicalUrl}
          </p>
          <p className="text-lg leading-6 text-blue-800">
            {title || "عنوان سئو محصول | کرمان آتاری"}
          </p>
          <p className="line-clamp-2 text-xs leading-5 text-slate-600">
            {metaDescription ||
              "متا توضیحات محصول اینجا نمایش داده می‌شود. این متن در نتایج جستجوی گوگل زیر عنوان صفحه دیده می‌شود."}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="rounded-xl border border-white/30 bg-white/10 p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span>امتیاز سئو</span>
          <span
            className={
              score >= 80
                ? "text-emerald-400"
                : score >= 50
                  ? "text-amber-400"
                  : "text-red-400"
            }
          >
            {score}٪
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 80
                ? "bg-emerald-500"
                : score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Checks */}
      <ul className="space-y-2">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-start gap-2 rounded-lg border border-white/20 bg-white/5 p-3"
          >
            {statusIcon(check.status)}
            <div>
              <p className="text-xs font-semibold">{check.label}</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-300">
                {check.message}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SeoAnalyzer;
