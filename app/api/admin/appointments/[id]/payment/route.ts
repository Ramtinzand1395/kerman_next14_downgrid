import Appointment from "@/model/Appointment";
import BusinessSmsEvent from "@/model/BusinessSmsEvent";
import { requireAppointmentOperator, fail, ok, withRateLimit } from "@/lib/loyalty/api";
import { createAppointmentPaymentLink } from "@/lib/appointments/payment-link";
import { notifyUser } from "@/lib/notifications/service";
import { deliverBusinessSms } from "@/lib/sms/business";
import { SERVICE_SMS_PATTERNS, appointmentPaymentReadySmsKey } from "@/lib/sms/order-patterns";

export async function POST(_req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireAppointmentOperator();
  if ("error" in auth) return auth.error;
  const limited = withRateLimit(`appointment-admin-pay:${auth.userId}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const result = await createAppointmentPaymentLink(id);
  if ("error" in result) return fail(result.error, result.status);
  const appointment = await Appointment.findById(id).lean();
  if (!appointment) return fail("درخواست پیدا نشد", 404);

  // Courier SMS belongs to the ready transition. The payment endpoint only reports its recorded status.
  const authority = appointment.payment?.authority;
  const eventKey = `APPOINTMENT_PAYMENT_LINK:${id}:${authority}`;
  const [notification, sms] = await Promise.allSettled([
    notifyUser({
      userId: appointment.user,
      title: "پرداخت سفارش نصب بازی",
      message: `مبلغ نهایی درخواست ${appointment.trackingCode}: ${appointment.pricing.finalAmount.toLocaleString("fa-IR")} تومان. برای مشاهده سفارش و پرداخت آنلاین، این اعلان را باز کنید.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: `/my-profile?step=5&ordersTab=games#appointment-${id}`,
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
    url: result.url,
    trackingCode: appointment.trackingCode,
    smsStatus: sms.status === "fulfilled" ? sms.value.state : "failed",
    notificationStatus: notification.status === "fulfilled" ? "sent" : "failed",
  });
}
