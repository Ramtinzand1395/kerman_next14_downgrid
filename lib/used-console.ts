export type ConsoleCondition = "new" | "used";
export const consoleChecks = {
  "playstation-2": ["تصویر و صدا", "دسته", "دیسک‌خوان", "اجرای بازی از فلش", "ذخیره روی مموری کارت"],
  "playstation-3": ["تصویر HDMI", "دسته", "دیسک‌خوان", "اجرای پیوسته بازی"],
  "playstation-4": ["تصویر HDMI", "دیسک‌خوان", "صدای فن حین بازی", "شبکه", "آنالوگ‌های دسته"],
  "playstation-5": ["تصویر HDMI", "درایو دیسک", "اجرای بازی", "آنالوگ‌های دسته", "شارژ و تریگرهای دسته"],
} as const;
export type ConsoleGeneration = keyof typeof consoleChecks;
export function isConsoleGeneration(slug: unknown): slug is ConsoleGeneration {
  return typeof slug === "string" && Object.hasOwn(consoleChecks, slug);
}
export const reportLabels = {
  model: "مدل دقیق و ظرفیت دستگاه",
  appearance: "ظاهر دستگاه و ایرادهای قابل مشاهده",
  repairHistory: "سابقهٔ تعمیر یا سرویس",
  accessories: "لوازم همراه و وضعیت اصالت آن‌ها",
  terms: "شرایط مهلت تست و پیگیری",
  testedOn: "تاریخ بررسی",
} as const;
export const testResults = ["سالم", "ایراد دارد", "تست نشده", "در این مدل وجود ندارد"] as const;
export type ConsoleReport = Partial<Record<keyof typeof reportLabels, string>> & {
  checks?: Record<string, string>;
  notes?: string;
};

export function readConsoleReport(value: unknown, generation: ConsoleGeneration, published: boolean): ConsoleReport {
  if (value != null && (typeof value !== "object" || Array.isArray(value))) throw Error("گزارش دستگاه نامعتبر است.");
  const raw = (value ?? {}) as Record<string, unknown>;
  const report: ConsoleReport = {};
  function readText(key: string, label: string, required: boolean) {
    const value = raw[key] ?? "";
    if (typeof value !== "string" || value.length > 1200) throw Error(`مقدار «${label}» نامعتبر است.`);
    if (required && !value.trim()) throw Error(`برای انتشار، «${label}» را تکمیل کنید.`);
    return value.trim();
  }
  for (const key of Object.keys(reportLabels) as (keyof typeof reportLabels)[]) {
    report[key] = readText(key, reportLabels[key], published);
  }
  if (report.testedOn) {
    const date = new Date(report.testedOn);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.testedOn) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== report.testedOn) {
      throw Error("تاریخ بررسی نامعتبر است.");
    }
  }
  report.notes = readText("notes", "شرح تست و ایراد فنی", false);
  report.checks = {};
  for (const label of consoleChecks[generation]) {
    const result = (raw.checks as Record<string, unknown> | null)?.[label];
    if (!result && !published) continue;
    if (!testResults.some(option => option === result)) throw Error(`نتیجهٔ «${label}» را مشخص کنید.`);
    report.checks[label] = String(result);
  }
  if (published && Object.values(report.checks).includes("ایراد دارد") && !report.notes) {
    throw Error("ایراد مشاهده‌شده را در شرح تست توضیح دهید.");
  }
  return report;
}
