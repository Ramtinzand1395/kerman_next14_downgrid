"use client";

import { consoleChecks, reportLabels, testResults, type ConsoleGeneration, type ConsoleReport } from "@/lib/used-console";
import type { ProductForm } from "@/types";

type Props = {
  generation: ConsoleGeneration;
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
};

export default function UsedConsoleFields({ generation, form, updateField }: Props) {
  const report = form.usedConsole ?? {};
  const update = (change: Partial<ConsoleReport>) => updateField("usedConsole", { ...report, ...change });
  const control = "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100";
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-700 p-4 text-sm text-slate-200">
      <legend className="px-2">وضعیت همین دستگاه</legend>
      <label className="block">وضعیت کالا
        <select className={control} value={form.condition ?? ""} onChange={event =>
          updateField("condition", (event.target.value || null) as ProductForm["condition"])}>
          <option value="">مشخص نشده</option><option value="new">نو</option><option value="used">کارکرده</option>
        </select>
      </label>
      {form.condition === "used" && <>
        <p>برای این دستگاه یک محصول فیزیکی تک‌مدلی بسازید. عکس‌های همین واحد را در بخش تصاویر وارد کنید.</p>
        {Object.entries(reportLabels).map(([rawKey, label]) => {
          const key = rawKey as keyof typeof reportLabels;
          return <label className="block" key={key}>{label}
            <input className={control} type={key === "testedOn" ? "date" : "text"}
              value={report[key] ?? ""} maxLength={1200}
              onChange={event => update({ [key]: event.target.value })} />
          </label>;
        })}
        <div className="grid gap-3 sm:grid-cols-2">
          {consoleChecks[generation].map(label =>
            <label key={label}>{label}
              <select className={control} value={report.checks?.[label] ?? ""} onChange={event =>
                update({ checks: { ...report.checks, [label]: event.target.value } })}>
                <option value="">انتخاب نتیجه</option>
                {testResults.map(result => <option key={result}>{result}</option>)}
              </select>
            </label>)}
        </div>
        <label className="block">شرح تست، مدت اجرای بازی و ایراد فنی
          <textarea className={control} maxLength={1200} value={report.notes ?? ""}
            onChange={event => update({ notes: event.target.value })} />
        </label>
      </>}
    </fieldset>
  );
}
