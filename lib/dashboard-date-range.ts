import moment from "moment-jalaali";

export const REPORT_TIME_ZONE = "Asia/Tehran";
export const REPORT_MAX_DAYS = 366;

export const REPORT_RANGE_KEYS = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "thisYear",
  "custom",
] as const;

export type ReportRangeKey = (typeof REPORT_RANGE_KEYS)[number];
export type ReportGranularity = "hour" | "day" | "jalali-month";
export type DateParts = { year: number; month: number; day: number; hour?: number; minute?: number; second?: number };
export type ReportBucket = { key: string; label: string; startInclusive: Date; endExclusive: Date };
export type ReportRange = {
  key: ReportRangeKey;
  startInclusive: Date;
  endExclusive: Date;
  startJalali: string;
  endJalali: string;
  granularity: ReportGranularity;
  buckets: ReportBucket[];
  durationDays: number;
};

export class ReportRangeError extends Error {
  readonly code: "INVALID_RANGE" | "INVALID_DATE" | "REVERSED_RANGE" | "RANGE_TOO_LARGE";

  constructor(
    message: string,
    code: "INVALID_RANGE" | "INVALID_DATE" | "REVERSED_RANGE" | "RANGE_TOO_LARGE",
  ) {
    super(message);
    this.name = "ReportRangeError";
    this.code = code;
  }
}

const gregorianFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partNumber(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) throw new Error(`Missing ${type} while formatting Tehran date`);
  return Number(value);
}

export function getTehranParts(date: Date): Required<DateParts> {
  const parts = gregorianFormatter.formatToParts(date);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
    hour: partNumber(parts, "hour"),
    minute: partNumber(parts, "minute"),
    second: partNumber(parts, "second"),
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getTehranParts(date);
  const wallClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert an explicit Tehran wall-clock value to its UTC instant. */
export function tehranDateTimeToUtc(parts: DateParts): Date {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  let candidate = new Date(targetAsUtc);
  for (let index = 0; index < 2; index += 1) {
    candidate = new Date(targetAsUtc - getTimeZoneOffsetMs(candidate));
  }
  return candidate;
}

function addGregorianDays(parts: DateParts, days: number): DateParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function startOfTehranDay(date: Date): Date {
  return tehranDateTimeToUtc(getTehranParts(date));
}

function gregorianToJalali(parts: DateParts) {
  return moment(
    `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    "YYYY-MM-DD",
    true,
  ).format("jYYYY-jMM-jDD");
}

export function utcToJalaliDate(date: Date) {
  return gregorianToJalali(getTehranParts(date));
}

export function parseJalaliDate(value: string): DateParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReportRangeError("تاریخ باید با قالب YYYY-MM-DD شمسی ارسال شود.", "INVALID_DATE");
  }
  const parsed = moment(value, "jYYYY-jMM-jDD", true);
  if (!parsed.isValid() || parsed.format("jYYYY-jMM-jDD") !== value) {
    throw new ReportRangeError("تاریخ شمسی واردشده معتبر نیست.", "INVALID_DATE");
  }
  return { year: parsed.year(), month: parsed.month() + 1, day: parsed.date() };
}

export function jalaliDateToUtcStart(value: string) {
  return tehranDateTimeToUtc(parseJalaliDate(value));
}

function jalaliParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new ReportRangeError("تاریخ شمسی معتبر نیست.", "INVALID_DATE");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function jalaliMonthStart(year: number, month: number) {
  const normalizedYear = year + Math.floor((month - 1) / 12);
  const normalizedMonth = ((month - 1) % 12 + 12) % 12 + 1;
  return jalaliDateToUtcStart(`${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-01`);
}

function endDisplayDate(endExclusive: Date) {
  return utcToJalaliDate(new Date(endExclusive.getTime() - 1));
}

function chooseGranularity(key: ReportRangeKey, durationDays: number): ReportGranularity {
  if (key === "today") return "hour";
  if (key === "thisYear" || durationDays > 62) return "jalali-month";
  return "day";
}

function formatHourLabel(date: Date) {
  const hour = getTehranParts(date).hour;
  return `ساعت ${hour.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: REPORT_TIME_ZONE,
    calendar: "persian",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: REPORT_TIME_ZONE,
    calendar: "persian",
    year: "numeric",
    month: "long",
  }).format(date);
}

export function createBuckets(startInclusive: Date, endExclusive: Date, granularity: ReportGranularity): ReportBucket[] {
  const buckets: ReportBucket[] = [];
  if (granularity === "hour") {
    let cursor = startInclusive;
    while (cursor < endExclusive) {
      const next = new Date(cursor.getTime() + 60 * 60 * 1000);
      buckets.push({ key: cursor.toISOString(), label: formatHourLabel(cursor), startInclusive: cursor, endExclusive: next < endExclusive ? next : endExclusive });
      cursor = next;
    }
    return buckets;
  }
  if (granularity === "day") {
    let cursor = startInclusive;
    while (cursor < endExclusive) {
      const next = tehranDateTimeToUtc(addGregorianDays(getTehranParts(cursor), 1));
      buckets.push({ key: cursor.toISOString(), label: formatDayLabel(cursor), startInclusive: cursor, endExclusive: next < endExclusive ? next : endExclusive });
      cursor = next;
    }
    return buckets;
  }
  let cursor = startInclusive;
  while (cursor < endExclusive) {
    const jalali = jalaliParts(utcToJalaliDate(cursor));
    const monthStart = jalaliMonthStart(jalali.year, jalali.month);
    const next = jalaliMonthStart(jalali.year, jalali.month + 1);
    const bucketStart = monthStart < startInclusive ? startInclusive : monthStart;
    buckets.push({ key: bucketStart.toISOString(), label: formatMonthLabel(monthStart), startInclusive: bucketStart, endExclusive: next < endExclusive ? next : endExclusive });
    cursor = next;
  }
  return buckets;
}

export function resolveReportRange(
  input: { range?: string | null; start?: string | null; end?: string | null },
  now = new Date(),
): ReportRange {
  const legacyAliases: Record<string, ReportRangeKey> = {
    daily: "today",
    weekly: "last7",
    monthly: "last30",
    yearly: "thisYear",
  };
  const requestedKey = input.range || "last30";
  const key = (legacyAliases[requestedKey] || requestedKey) as ReportRangeKey;
  if (!REPORT_RANGE_KEYS.includes(key)) {
    throw new ReportRangeError("بازهٔ گزارش معتبر نیست.", "INVALID_RANGE");
  }
  const todayStart = startOfTehranDay(now);
  const todayParts = getTehranParts(todayStart);
  let startInclusive: Date;
  let endExclusive: Date;

  switch (key) {
    case "today":
      startInclusive = todayStart;
      endExclusive = tehranDateTimeToUtc(addGregorianDays(todayParts, 1));
      break;
    case "last7":
      startInclusive = tehranDateTimeToUtc(addGregorianDays(todayParts, -6));
      endExclusive = tehranDateTimeToUtc(addGregorianDays(todayParts, 1));
      break;
    case "last30":
      startInclusive = tehranDateTimeToUtc(addGregorianDays(todayParts, -29));
      endExclusive = tehranDateTimeToUtc(addGregorianDays(todayParts, 1));
      break;
    case "thisMonth": {
      const current = jalaliParts(utcToJalaliDate(todayStart));
      startInclusive = jalaliMonthStart(current.year, current.month);
      endExclusive = jalaliMonthStart(current.year, current.month + 1);
      break;
    }
    case "thisYear": {
      const current = jalaliParts(utcToJalaliDate(todayStart));
      startInclusive = jalaliDateToUtcStart(`${current.year}-01-01`);
      endExclusive = jalaliDateToUtcStart(`${current.year + 1}-01-01`);
      break;
    }
    case "custom": {
      if (!input.start || !input.end) {
        throw new ReportRangeError("تاریخ شروع و پایان بازهٔ دلخواه الزامی است.", "INVALID_DATE");
      }
      startInclusive = jalaliDateToUtcStart(input.start);
      const inclusiveEnd = jalaliDateToUtcStart(input.end);
      endExclusive = tehranDateTimeToUtc(addGregorianDays(getTehranParts(inclusiveEnd), 1));
      if (startInclusive > inclusiveEnd) {
        throw new ReportRangeError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.", "REVERSED_RANGE");
      }
      break;
    }
  }

  const durationDays = Math.round((endExclusive.getTime() - startInclusive.getTime()) / 86_400_000);
  if (durationDays > REPORT_MAX_DAYS) {
    throw new ReportRangeError(`حداکثر بازهٔ مجاز ${REPORT_MAX_DAYS.toLocaleString("fa-IR")} روز است.`, "RANGE_TOO_LARGE");
  }
  const granularity = chooseGranularity(key, durationDays);
  return {
    key,
    startInclusive,
    endExclusive,
    startJalali: utcToJalaliDate(startInclusive),
    endJalali: endDisplayDate(endExclusive),
    granularity,
    buckets: createBuckets(startInclusive, endExclusive, granularity),
    durationDays,
  };
}

export function previousReportRange(range: ReportRange): ReportRange {
  const duration = range.endExclusive.getTime() - range.startInclusive.getTime();
  const endExclusive = range.startInclusive;
  const startInclusive = new Date(endExclusive.getTime() - duration);
  return {
    ...range,
    startInclusive,
    endExclusive,
    startJalali: utcToJalaliDate(startInclusive),
    endJalali: endDisplayDate(endExclusive),
    buckets: createBuckets(startInclusive, endExclusive, range.granularity),
  };
}

export function bucketIndexForDate(date: Date, buckets: ReportBucket[]) {
  const timestamp = date.getTime();
  return buckets.findIndex((bucket) => timestamp >= bucket.startInclusive.getTime() && timestamp < bucket.endExclusive.getTime());
}

export function safePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
