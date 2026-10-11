import { z } from "zod";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import AppointmentSettings from "@/model/AppointmentSettings";
import { getAppointmentSettings } from "@/lib/appointments/settings";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  slotMinutes: z.number().int().min(15).max(180).optional(),
  bookingDaysAhead: z.number().int().min(1).max(120).optional(),
  workingBlocks: z.array(z.object({ start: time, end: time })).min(1).max(6).optional(),
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(180).optional(),
  serviceCapacity: z.object({
    game_install: z.number().int().min(1).max(50),
    repair: z.number().int().min(1).max(50),
  }).optional(),
  maxActiveAppointmentsPerUser: z.number().int().min(1).max(20).optional(),
  cancellationNoticeMinutes: z.number().int().min(0).max(43200).optional(),
  supportedDevices: z.array(z.string().min(2).max(60)).min(1).max(30).optional(),

  // Courier settings
  courierEnabled: z.boolean().optional(),
  courierBookingDaysAhead: z.number().int().min(1).max(60).optional(),
  courierCapacityPerWindow: z.number().int().min(1).max(50).optional(),
  courierWorkingWindows: z.array(z.object({ start: time, end: time })).min(1).max(10).optional(),
  courierClosedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  courierClosedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(180).optional(),
  courierRegions: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        title: z.string().trim().min(1).max(100),
        city: z.string().trim().min(1).max(100),
        shippingCost: z.number().int().min(0).max(10_000_000),
        isActive: z.boolean(),
      }),
    )
    .max(50)
    .optional(),
  courierRoundTripMultiplier: z.number().int().min(1).max(2).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await getAppointmentSettings());
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "تنظیمات نامعتبر است", 422);
  for (const block of parsed.data.workingBlocks ?? []) {
    if (block.start >= block.end) return fail("شروع هر بازه حضوری باید قبل از پایان آن باشد.", 422);
  }
  for (const block of parsed.data.courierWorkingWindows ?? []) {
    if (block.start >= block.end) return fail("شروع هر بازه پیک باید قبل از پایان آن باشد.", 422);
  }
  const doc = await AppointmentSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { ...parsed.data, updatedBy: auth.userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true },
  );
  return ok(doc);
}

