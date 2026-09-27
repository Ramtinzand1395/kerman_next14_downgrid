"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Clock3,
  FileText,
  Link2,
  Search,
} from "lucide-react";
import type { BlogSeoAnalysis, SeoCheckStatus } from "@/lib/blogSeo";

type SeoAuditPanelProps = {
  analysis: BlogSeoAnalysis;
  title: string;
  seoTitle: string;
  slug: string;
  metaDescription: string;
};

const statusStyles: Record<SeoCheckStatus, string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  fail: "border-rose-200 bg-rose-50 text-rose-700",
};

const StatusIcon = ({ status }: { status: SeoCheckStatus }) => {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 shrink-0" />;
  return <CircleX className="h-4 w-4 shrink-0" />;
};

export default function SeoAuditPanel({
  analysis,
  title,
  seoTitle,
  slug,
  metaDescription,
}: SeoAuditPanelProps) {
  const scoreColor =
    analysis.score >= 80
      ? "#059669"
      : analysis.score >= 55
        ? "#d97706"
        : "#e11d48";
  const passed = analysis.checks.filter((check) => check.status === "pass").length;

  return (
    <aside id="seo-audit" className="space-y-4 lg:sticky lg:top-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              امتیاز سئو
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              {analysis.readyToPublish ? "آماده انتشار" : "نیازمند بهبود"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {passed.toLocaleString("fa-IR")} از{" "}
              {analysis.checks.length.toLocaleString("fa-IR")} بررسی با موفقیت
            </p>
          </div>
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-2"
            style={{
              background: `conic-gradient(${scoreColor} ${analysis.score}%, #e2e8f0 0)`,
            }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-white">
              <strong className="text-xl text-slate-900">
                {analysis.score.toLocaleString("fa-IR")}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              تعداد کلمه
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              {analysis.stats.wordCount.toLocaleString("fa-IR")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              زمان مطالعه
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              {analysis.stats.readingTime.toLocaleString("fa-IR")} دقیقه
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Search className="h-3.5 w-3.5" />
              تراکم کلیدی
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              {analysis.stats.keywordDensity.toLocaleString("fa-IR")}٪
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link2 className="h-3.5 w-3.5" />
              لینک‌ها
            </div>
            <p className="mt-1 text-sm font-black text-slate-800">
              {(
                analysis.stats.internalLinks + analysis.stats.externalLinks
              ).toLocaleString("fa-IR")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">پیش‌نمایش گوگل</h3>
          <span className="text-[11px] text-slate-400">نمایش تقریبی</span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3" dir="rtl">
          <p className="truncate text-xs text-emerald-700">
            kermanatari.com › blog › {slug || "..."}
          </p>
          <p className="mt-1 line-clamp-1 text-base font-medium text-blue-700">
            {seoTitle || title || "عنوان مقاله"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
            {metaDescription ||
              "توضیحات متا در نتایج جستجو در این قسمت نمایش داده می‌شود."}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900">چک‌لیست انتشار</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              analysis.readyToPublish
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {analysis.readyToPublish ? "تأیید شده" : "انتشار مسدود"}
          </span>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pl-1">
          {analysis.checks.map((check) => (
            <div
              key={check.id}
              className={`rounded-xl border p-3 ${statusStyles[check.status]}`}
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                <h4 className="text-xs font-black">{check.title}</h4>
              </div>
              <p className="mt-1.5 pr-6 text-[11px] leading-5 opacity-90">
                {check.message}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          موارد قرمز مانع انتشار هستند. موارد زرد پیشنهاد بهبودند و ذخیره پیش‌نویس
          در هر مرحله امکان‌پذیر است.
        </p>
      </section>
    </aside>
  );
}
