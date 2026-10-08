import { NextResponse } from "next/server";
import Appointment from "@/model/Appointment";
import { requireUser } from "@/lib/loyalty/api";
import { appointmentCreateSchema, appointmentUserUpdateSchema } from "@/validations/appointment.validation";
import { createAppointment, cancelAppointment, rescheduleAppointment } from "@/lib/appointments/service";
import { stripHtmlTags } from "@/helpers/stripHtmlTags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const appointments = await Appointment.find({ user: auth.userId })
    .populate("selectedReward")
    .sort({ startsAt: -1 })
    .lean();
  return NextResponse.json({ appointments });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = appointmentCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "اطلاعات نوبت نامعتبر است." }, { status: 422 });
  }
  const headerKey = req.headers.get("Idempotency-Key")?.trim();
  if (headerKey && headerKey !== parsed.data.clientRequestKey) {
    return NextResponse.json({ error: "کلید ثبت تکراری هدر و بدنه یکسان نیست." }, { status: 400 });
  }
  const result = await createAppointment(auth.userId, {
    ...parsed.data,
    customerName: stripHtmlTags(parsed.data.customerName),
    description: stripHtmlTags(parsed.data.description),
    ...(parsed.data.fulfillment === "courier" && parsed.data.recipientName
      ? { recipientName: stripHtmlTags(parsed.data.recipientName) }
      : {}),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: result.reused ? 200 : 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = appointmentUserUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 422 });
  const result =
    parsed.data.action === "cancel"
      ? await cancelAppointment(auth.userId, parsed.data.appointmentId)
      : await rescheduleAppointment(
          auth.userId,
          parsed.data.appointmentId,
          parsed.data.startsAt
            ? parsed.data.startsAt
            : {
                pickupDate: parsed.data.pickupDate,
                pickupWindow: parsed.data.pickupWindow,
              },
        );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

