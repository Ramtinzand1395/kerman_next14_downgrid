// lib/loyalty/dateKeys.ts
// ابزار کلیدهای دوره (روز/هفته/ماه) بر اساس تقویم میلادی سرور.
// این کلیدها ستون Idempotency ماموریت‌ها، گردونه و زنجیره ورود هستند.
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** کلید هفته ISO — مثل 2026-W31 */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function periodKey(period: "daily" | "weekly" | "monthly" | "once", d = new Date()): string {
  switch (period) {
    case "daily":
      return dayKey(d);
    case "weekly":
      return weekKey(d);
    case "monthly":
      return monthKey(d);
    case "once":
      return "once";
  }
}

/** کلید روزِ دیروز — برای تشخیص پیوستگی زنجیره ورود */
export function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return dayKey(y);
}
