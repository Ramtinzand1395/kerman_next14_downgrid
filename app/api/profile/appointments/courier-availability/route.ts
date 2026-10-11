import { NextResponse } from "next/server";
import AppointmentReservation from "@/model/AppointmentReservation";
import { requireUser } from "@/lib/loyalty/api";
import { courierSlotKey } from "@/lib/appointments/policy";
import {
  courierWindowIsConfigured,
  getAppointmentSettings,
  isWindowInPast,
  tehranDateTime,
} from "@/lib/appointments/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "تاریخ نامعتبر است." }, { status: 422 });
  }

  const settings = await getAppointmentSettings();
  const now = new Date();

  const activeRegions = ((settings.courierRegions || []) as Array<{
    id: string;
    title: string;
    city: string;
    shippingCost: number;
    isActive: boolean;
  }>).filter((r) => Boolean(r?.isActive));

  if (!settings.courierEnabled) {
    return NextResponse.json({
      date,
      windows: [],
      settings: {
        courierEnabled: false,
        bookingDaysAhead: settings.courierBookingDaysAhead || 14,
        regions: activeRegions,
        roundTripMultiplier: settings.courierRoundTripMultiplier || 2,
        closed: true,
      },
    });
  }

  const lastBookableDays = settings.courierBookingDaysAhead || 14;
  const lastBookable = new Date(now.getTime() + lastBookableDays * 86400_000);
  const parsedDayStart = tehranDateTime(date, "00:00");
  if (!parsedDayStart || parsedDayStart > lastBookable) {
    return NextResponse.json({
      date,
      windows: [],
      settings: {
        courierEnabled: settings.courierEnabled,
        bookingDaysAhead: settings.courierBookingDaysAhead,
        regions: activeRegions,
        roundTripMultiplier: settings.courierRoundTripMultiplier || 2,
        closed: true,
      },
    });
  }

  const capacity = Number(settings.courierCapacityPerWindow || 3);
  const windows: Array<{
    start: string;
    end: string;
    remaining: number;
    available: boolean;
  }> = [];

  for (const win of settings.courierWorkingWindows || []) {
    const isConfigured = courierWindowIsConfigured(date, win, settings);
    const inPast = isWindowInPast(date, win.end, now);

    if (!isConfigured || inPast) {
      windows.push({
        start: win.start,
        end: win.end,
        remaining: 0,
        available: false,
      });
      continue;
    }

    const key = courierSlotKey(date, win.start, win.end);
    const occupied = await AppointmentReservation.countDocuments({
      slotKey: key,
      releasedAt: null,
      $or: [{ finalizedAt: { $ne: null } }, { expiresAt: { $gt: now } }],
    });

    const remaining = Math.max(0, capacity - occupied);
    windows.push({
      start: win.start,
      end: win.end,
      remaining,
      available: remaining > 0,
    });
  }

  return NextResponse.json({
    date,
    windows,
    settings: {
      courierEnabled: settings.courierEnabled,
      bookingDaysAhead: settings.courierBookingDaysAhead,
      capacityPerWindow: capacity,
      regions: activeRegions,
      roundTripMultiplier: settings.courierRoundTripMultiplier || 2,
      closed: windows.every((w) => !w.available),
    },
  });
}
