import AppointmentSettings from "@/model/AppointmentSettings";

export async function getAppointmentSettings() {
  return AppointmentSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

export function tehranDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+03:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function tehranDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function weekdayForTehranDate(date: string) {
  return new Date(`${date}T12:00:00+03:30`).getUTCDay();
}

export function slotIsConfigured(
  date: string,
  time: string,
  settings: {
    slotMinutes: number;
    workingBlocks: Array<{ start: string; end: string }>;
    closedWeekdays: number[];
    closedDates: string[];
  },
) {
  if (settings.closedDates.includes(date) || settings.closedWeekdays.includes(weekdayForTehranDate(date))) return false;
  const [hour, minute] = time.split(":").map(Number);
  const value = hour * 60 + minute;
  return settings.workingBlocks.some((block) => {
    const [startHour, startMinute] = block.start.split(":").map(Number);
    const [endHour, endMinute] = block.end.split(":").map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return value >= start && value + settings.slotMinutes <= end && (value - start) % settings.slotMinutes === 0;
  });
}

export function courierWindowIsConfigured(
  date: string,
  window: { start: string; end: string },
  settings: {
    courierWorkingWindows: Array<{ start: string; end: string }>;
    courierClosedWeekdays: number[];
    courierClosedDates: string[];
  },
) {
  if (
    settings.courierClosedDates.includes(date) ||
    settings.courierClosedWeekdays.includes(weekdayForTehranDate(date))
  ) {
    return false;
  }
  return settings.courierWorkingWindows.some(
    (w) => w.start === window.start && w.end === window.end,
  );
}

export function isWindowInPast(date: string, endTime: string, now: Date = new Date()): boolean {
  const windowEnd = tehranDateTime(date, endTime);
  if (!windowEnd) return true;
  return windowEnd.getTime() <= now.getTime();
}

export function findCourierRegion(
  city: string,
  regions: Array<{ id: string; title: string; city: string; shippingCost: number; isActive: boolean }>,
  regionId?: string,
) {
  if (regionId) {
    const byId = regions.find((r) => r.id === regionId && r.isActive);
    if (byId) return byId;
  }
  const normalizedCity = city.trim().toLowerCase();
  return (
    regions.find(
      (r) => r.isActive && r.city.trim().toLowerCase() === normalizedCity,
    ) ?? null
  );
}

