type ExtendedDate = { $date?: string } | { "$date"?: string };

export const toPersianDate = (value: unknown) => {
  if (!value) return "";

  let d: Date | null = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "string" || typeof value === "number") {
    d = new Date(value);
  } else if (typeof value === "object") {
    const v = value as ExtendedDate;
    const iso = (v as any).$date ?? (v as any)["$date"];
    if (typeof iso === "string") d = new Date(iso);
  }

  // اگر تاریخ نامعتبر بود، خروجی خالی بده (یا "-"
  if (!d || Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};