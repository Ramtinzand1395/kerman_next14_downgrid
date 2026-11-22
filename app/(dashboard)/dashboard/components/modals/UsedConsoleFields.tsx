"use client";

import { ClipboardCheck, ShieldCheck } from "lucide-react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
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
  const control = "mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15";

  return (
    <fieldset className="space-y-5 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-slate-800 sm:p-5">
      <legend className="px-2 text-sm font-bold text-teal-800">وضعیت کنسول</legend>
      <div role="group" aria-label="وضعیت کالا" className="grid grid-cols-2 gap-3">
        {([
          { value: "new", label: "کنسول نو", sub: "دستگاه استفاده‌نشده" },
          { value: "used", label: "کنسول کارکرده", sub: "تست مستقل همین دستگاه" },
        ] as const).map(option => (
          <button key={option.value} type="button" aria-pressed={form.condition === option.value}
            onClick={() => updateField("condition", option.value)}
            className={"rounded-xl border p-3 text-right transition " +
              (form.condition === option.value ? "border-teal-500 bg-teal-50 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-500")}>
            <strong className="block text-sm">{option.label}</strong>
            <span className="mt-1 block text-xs text-slate-500">{option.sub}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => updateField("condition", null)} className="text-xs text-slate-500 underline-offset-4 hover:text-teal-800 hover:underline">
        پاک‌کردن انتخاب وضعیت
      </button>

      {form.condition === "used" && <>
        <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-6 text-sky-800">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
          <p>هر دستگاه کارکرده یک محصول تک‌مدلی با موجودی حداکثر یک عدد است. اطلاعات و عکس‌ها باید دقیقاً متعلق به همین دستگاه باشند. گزارش ناقص در پیش‌نویس مجاز است؛ انتشار به تکمیل همه بررسی‌ها نیاز دارد.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(reportLabels).map(([rawKey, label]) => {
            const key = rawKey as keyof typeof reportLabels;
            return <label key={key} className={"block text-xs font-semibold text-slate-700 " + (key === "appearance" || key === "terms" ? "sm:col-span-2" : "")}>
              {label} <span className="text-rose-400">*</span>
              {key === "testedOn" ? (
                <div className="mt-2">
                  <DatePicker
                    value={report.testedOn
                      ? new DateObject({ date: report.testedOn, format: "YYYY-MM-DD", calendar: gregorian }).convert(persian, persianFa)
                      : null}
                    calendar={persian}
                    locale={persianFa}
                    calendarPosition="bottom-right"
                    format="YYYY/MM/DD"
                    inputClass={control}
                    containerClassName="w-full"
                    placeholder="تاریخ بررسی را از تقویم شمسی انتخاب کنید"
                    onChange={(date: DateObject | null) =>
                      update({ testedOn: date ? date.convert(gregorian, gregorianEn).format("YYYY-MM-DD") : "" })
                    }
                  />
                  <span className="mt-1 block text-[11px] font-normal text-slate-500">
                    تاریخ به‌صورت شمسی نمایش داده می‌شود و برای ثبت دقیق، میلادی استاندارد ذخیره خواهد شد.
                  </span>
                </div>
              ) : key === "appearance" || key === "terms" ? (
                <textarea rows={2} maxLength={1200} placeholder={placeholders[key]}
                  className={control} value={report[key] ?? ""}
                  onChange={event => update({ [key]: event.target.value })} />
              ) : (
                <input type="text" maxLength={1200}
                  placeholder={placeholders[key]} value={report[key] ?? ""}
                  className={control} onChange={event => update({ [key]: event.target.value })} />
              )}
            </label>;
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold"><ClipboardCheck className="h-4 w-4 text-teal-700" /> نتیجه بررسی قطعات</h4>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">{done.toLocaleString("fa-IR")} از {checks.length.toLocaleString("fa-IR")} تست مشخص شده</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {checks.map(label => (
              <label key={label} className="block text-xs font-semibold text-slate-700">
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
        <label className="block text-xs font-semibold text-slate-700">
          شرح تست، مدت اجرای بازی و ایرادهای مشاهده‌شده
          <textarea className={control} rows={4} maxLength={1200}
            placeholder="اگر بخشی ایراد دارد، نوع مشکل، شرایط بروز آن و نتیجه تست را دقیق توضیح دهید."
            value={report.notes ?? ""} onChange={event => update({ notes: event.target.value })} />
          <span className="mt-2 block text-xs font-normal leading-6 text-slate-500">اگر نتیجه یکی از تست‌ها «ایراد دارد» باشد، توضیح مشکل برای انتشار الزامی است.</span>
        </label>
      </>}
    </fieldset>
  );
}
