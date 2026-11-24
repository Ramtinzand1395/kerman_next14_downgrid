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


type ConsoleTagReference = { _id: string; slug: string; name?: string };
const normalizeTagKey = (value: string | undefined) =>
  (value || "").trim().toLowerCase()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s‌_-]+/g, "");

const conditionKeys = {
  used: ["used", "کارکرده", "دستدوم", "secondhand", "preowned"],
  new: ["new", "نو", "آکبند"],
};
const generationKeys: Record<ConsoleGeneration, string[]> = {
  "playstation-2": ["ps2", "playstation2", "پلیاستیشن2", "پیاستیشن2"],
  "playstation-3": ["ps3", "playstation3", "پلیاستیشن3", "پیاستیشن3"],
  "playstation-4": ["ps4", "playstation4", "پلیاستیشن4", "پیاستیشن4"],
  "playstation-5": ["ps5", "playstation5", "پلیاستیشن5", "پیاستیشن5"],
};

function tagMatches(tag: ConsoleTagReference, keys: string[]) {
  return keys.includes(normalizeTagKey(tag.slug)) || keys.includes(normalizeTagKey(tag.name));
}

function preferredTag(tags: ConsoleTagReference[], keys: string[]) {
  // Prefer the established canonical slug; fall back to the exact existing aliases.
  for (const key of keys) {
    const tag = tags.find((item) => normalizeTagKey(item.slug) === key);
    if (tag) return tag;
  }
  return tags.find((item) => tagMatches(item, keys));
}

/** Preserve unrelated tags, replace conflicting condition/generation tags, and use only existing tag IDs. */
export function syncUsedConsoleTags(
  selectedIds: string[],
  tags: ConsoleTagReference[],
  generation: ConsoleGeneration,
) {
  const used = preferredTag(tags, conditionKeys.used);
  const generationTag = preferredTag(tags, generationKeys[generation]);
  const lockedIds = [used?._id, generationTag?._id].filter((id): id is string => Boolean(id));
  const managed = new Set(tags.filter((tag) =>
    tagMatches(tag, conditionKeys.used) || tagMatches(tag, conditionKeys.new) ||
    Object.values(generationKeys).some((keys) => tagMatches(tag, keys)),
  ).map((tag) => tag._id));
  const tagIds = [...new Set([...selectedIds.filter((id) => !managed.has(id)), ...lockedIds])];
  const missing = [
    ...(!used ? ["کارکرده"] : []),
    ...(!generationTag ? [generationKeys[generation][0].toUpperCase()] : []),
  ];
  return { tagIds, lockedIds, missing };
}

export function removeUsedConditionTag(selectedIds: string[], tags: ConsoleTagReference[]) {
  const usedIds = new Set(tags.filter((tag) => tagMatches(tag, conditionKeys.used)).map((tag) => tag._id));
  return selectedIds.filter((id) => !usedIds.has(id));
}
