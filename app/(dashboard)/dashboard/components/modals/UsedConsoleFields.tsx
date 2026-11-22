"use client";

import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { consoleChecks, reportLabels, testResults, type ConsoleGeneration, type ConsoleReport } from "@/lib/used-console";
import type { ProductForm } from "@/types";

type Props = {
  generation: ConsoleGeneration;
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
};

const placeholders: Record<keyof typeof reportLabels, string> = {
  model: "مثلاً PS5 Slim، ظرفیت یک ترابایت، ریجن دستگاه",
  appearance: "خط‌وخش، تغییر رنگ، شکستگی یا وضعیت ظاهری بدنه",
  repairHistory: "تعمیر نشده / تعویض فن / سابقه باز شدن دستگاه",
  accessories: "تعداد دسته‌ها، کابل‌ها، جعبه و اصل یا غیراصل بودن لوازم",
  terms: "مثلاً ۴۸ ساعت مهلت تست طبق شرایط فروشگاه",
  testedOn: "",
};

export default function UsedConsoleFields({ generation, form, updateField }: Props) {
  const report = form.usedConsole ?? {};
  const update = (change: Partial<ConsoleReport>) => updateField("usedConsole", { ...report, ...change });
  const checks = consoleChecks[generation];
  const done = checks.filter(label => testResults.some(result => result === report.checks?.[label])).length;
  const control = "mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20";

  return (
    <fieldset className="space-y-5 rounded-2xl border border-lime-400/25 bg-lime-400/5 p-4 text-slate-200 sm:p-5">
      <legend className="px-2 text-sm font-bold text-lime-200">وضعیت کنسول</legend>
      <div role="group" aria-label="وضعیت کالا" className="grid grid-cols-2 gap-3">
        {([
          { value: "new", label: "کنسول نو", sub: "دستگاه استفاده‌نشده" },
          { value: "used", label: "کنسول کارکرده", sub: "تست مستقل همین دستگاه" },
        ] as const).map(option => (
          <button key={option.value} type="button" aria-pressed={form.condition === option.value}
            onClick={() => updateField("condition", option.value)}
            className={"rounded-xl border p-3 text-right transition " +
              (form.condition === option.value ? "border-indigo-400 bg-lime-400/15 text-white" : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500")}>
            <strong className="block text-sm">{option.label}</strong>
            <span className="mt-1 block text-xs text-slate-400">{option.sub}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => updateField("condition", null)} className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline">
        پاک‌کردن انتخاب وضعیت
      </button>

      {form.condition === "used" && <>
        <div className="flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-6 text-sky-200">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
          <p>هر دستگاه کارکرده یک محصول تک‌مدلی با موجودی حداکثر یک عدد است. اطلاعات و عکس‌ها باید دقیقاً متعلق به همین دستگاه باشند. گزارش ناقص در پیش‌نویس مجاز است؛ انتشار به تکمیل همه بررسی‌ها نیاز دارد.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(reportLabels).map(([rawKey, label]) => {
            const key = rawKey as keyof typeof reportLabels;
            return <label key={key} className={"block text-xs font-semibold text-slate-300 " + (key === "appearance" || key === "terms" ? "sm:col-span-2" : "")}>
              {label} <span className="text-rose-400">*</span>
              {key === "appearance" || key === "terms" ? (
                <textarea rows={2} maxLength={1200} placeholder={placeholders[key]}
                  className={control} value={report[key] ?? ""}
                  onChange={event => update({ [key]: event.target.value })} />
              ) : (
                <input type={key === "testedOn" ? "date" : "text"} maxLength={1200}
                  placeholder={placeholders[key]} value={report[key] ?? ""}
                  className={control} onChange={event => update({ [key]: event.target.value })} />
              )}
            </label>;
          })}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold"><ClipboardCheck className="h-4 w-4 text-lime-300" /> نتیجه بررسی قطعات</h4>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{done.toLocaleString("fa-IR")} از {checks.length.toLocaleString("fa-IR")} تست مشخص شده</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {checks.map(label => (
              <label key={label} className="block text-xs font-semibold text-slate-300">
                {label} <span className="text-rose-400">*</span>
                <select className={control} value={report.checks?.[label] ?? ""}
                  onChange={event => update({ checks: { ...report.checks, [label]: event.target.value } })}>
                  <option value="">نتیجه را انتخاب کنید</option>
                  {testResults.map(result => <option key={result} value={result}>{result}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
        <label className="block text-xs font-semibold text-slate-300">
          شرح تست، مدت اجرای بازی و ایرادهای مشاهده‌شده
          <textarea className={control} rows={4} maxLength={1200}
            placeholder="اگر بخشی ایراد دارد، نوع مشکل، شرایط بروز آن و نتیجه تست را دقیق توضیح دهید."
            value={report.notes ?? ""} onChange={event => update({ notes: event.target.value })} />
          <span className="mt-2 block text-xs font-normal leading-6 text-slate-400">اگر نتیجه یکی از تست‌ها «ایراد دارد» باشد، توضیح مشکل برای انتشار الزامی است.</span>
        </label>
      </>}
    </fieldset>
  );
}
