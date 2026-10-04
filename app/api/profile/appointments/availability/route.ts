import { NextResponse } from "next/server";
import AppointmentReservation from "@/model/AppointmentReservation";
import { requireUser } from "@/lib/loyalty/api";
import { ServiceType, slotKey } from "@/lib/appointments/policy";
import { getAppointmentSettings, slotIsConfigured, tehranDateTime } from "@/lib/appointments/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const serviceType = url.searchParams.get("serviceType") as ServiceType;
  const date = url.searchParams.get("date") || "";
  if (!["game_install", "repair"].includes(serviceType) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "خدمت یا تاریخ نامعتبر است." }, { status: 422 });
  }
  const settings = await getAppointmentSettings();
  const slots: Array<{ startsAt: string; endsAt: string; time: string; remaining: number; available: boolean }> = [];
  const capacity = Number(settings.serviceCapacity[serviceType]);
  for (const block of settings.workingBlocks) {
    const [startHour, startMinute] = block.start.split(":").map(Number);
    const [endHour, endMinute] = block.end.split(":").map(Number);
    for (let minute = startHour * 60 + startMinute; minute + settings.slotMinutes <= endHour * 60 + endMinute; minute += settings.slotMinutes) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      if (!slotIsConfigured(date, time, settings)) continue;
      const startsAt = tehranDateTime(date, time);
      if (!startsAt || startsAt <= new Date()) continue;
      const occupied = await AppointmentReservation.countDocuments({
        slotKey: slotKey(serviceType, startsAt),
        releasedAt: null,
        $or: [{ finalizedAt: { $ne: null } }, { expiresAt: { $gt: new Date() } }],
      });
      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + settings.slotMinutes * 60_000).toISOString(),
        time,
        remaining: Math.max(0, capacity - occupied),
        available: occupied < capacity,
      });
    }
  }
  return NextResponse.json({
    slots,
    settings: {
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      bookingDaysAhead: settings.bookingDaysAhead,
      supportedDevices: settings.supportedDevices,
      closed: slots.length === 0,
    },
  });
}

