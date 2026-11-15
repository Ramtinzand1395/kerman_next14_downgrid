import mongoose from "mongoose";
import { getSiteUrl } from "@/lib/baseUrl";
import Appointment from "@/model/Appointment";
import BusinessSmsEvent from "@/model/BusinessSmsEvent";
import { requireAppointmentOperator, fail, ok, withRateLimit } from "@/lib/loyalty/api";
import { isPayableAppointmentAmount } from "@/lib/appointments/payment-link";
import { appointmentOrdersPath, reconcileAppointmentPayment } from "@/lib/appointments/payment-recovery";
import { notifyUser } from "@/lib/notifications/service";
import { deliverBusinessSms } from "@/lib/sms/business";
import { SERVICE_SMS_PATTERNS, appointmentPaymentReadySmsKey } from "@/lib/sms/order-patterns";

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireAppointmentOperator();
  if ("error" in auth) return auth.error;
  const limited = withRateLimit(`appointment-admin-pay:${auth.userId}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه درخواست نامعتبر است", 422);
  const appointment = await Appointment.findById(id).lean();
  if (!appointment) return fail("درخواست پیدا نشد", 404);

  if (new URL(req.url).searchParams.get("check") === "1") {
    return ok({ paymentStatus: await reconcileAppointmentPayment(appointment) });
  }
  if (appointment.payment?.status === "paid") return fail("این درخواست قبلاً پرداخت شده است", 409);
  if (appointment.status !== "completed" || !appointment.pricing?.known) {
    return fail("ابتدا خدمات را تکمیل و مبلغ نهایی را ثبت کنید", 409);
  }
  const amount = appointment.pricing.finalAmount;
  if (!isPayableAppointmentAmount(amount)) return fail("مبلغ قابل پرداخت نامعتبر است", 422);

  const path = appointmentOrdersPath(id);
  // Courier SMS belongs to the ready transition. The payment endpoint only reports its recorded status.
  const eventKey = `APPOINTMENT_PAYMENT_LINK:${id}:${amount}`;
  const [notification, sms] = await Promise.allSettled([
    notifyUser({
      userId: appointment.user,
      title: "پرداخت سفارش نصب بازی",
      message: `مبلغ نهایی درخواست ${appointment.trackingCode}: ${amount.toLocaleString("fa-IR")} تومان. برای مشاهده سفارش و پرداخت آنلاین، این اعلان را باز کنید.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: path,
      senderType: "admin",
      senderId: auth.userId,
      eventKey,
    }),
    appointment.fulfillment === "courier"
      ? BusinessSmsEvent.findOne({ eventKey: appointmentPaymentReadySmsKey(id) }).select("status").lean()
        .then((event) => ({ state: event?.status ?? "not_requested" }))
      : deliverBusinessSms({
          eventKey,
          eventType: "APPOINTMENT_PAYMENT_LINK",
          entityType: "Appointment",
          entityId: id,
          bodyId: SERVICE_SMS_PATTERNS.installationPayment,
          to: appointment.phone,
          args: [appointment.trackingCode],
        }),
  ]);
  return ok({
    url: new URL(path, getSiteUrl()).href,
    trackingCode: appointment.trackingCode,
    smsStatus: sms.status === "fulfilled" ? sms.value.state : "failed",
    notificationStatus: notification.status === "fulfilled" ? "sent" : "failed",
  });
}
