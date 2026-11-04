import Appointment from "@/model/Appointment";
import { requireAdmin, fail, ok, withRateLimit } from "@/lib/loyalty/api";
import { createAppointmentPaymentLink } from "@/lib/appointments/payment-link";
import { notifyUser } from "@/lib/notifications/service";
import { deliverBusinessSms } from "@/lib/sms/business";
import { SERVICE_SMS_PATTERNS } from "@/lib/sms/order-patterns";

export async function POST(_req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const limited = withRateLimit(`appointment-admin-pay:${auth.userId}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const result = await createAppointmentPaymentLink(id);
  if ("error" in result) return fail(result.error, result.status);
  const appointment = await Appointment.findById(id).lean();
  if (!appointment) return fail("درخواست پیدا نشد", 404);

  // Each payment authority is sent at most once, even when the button is clicked repeatedly.
  const authority = appointment.payment?.authority;
  const eventKey = `APPOINTMENT_PAYMENT_LINK:${id}:${authority}`;
  const [notification, sms] = await Promise.allSettled([
    notifyUser({
      userId: appointment.user,
      title: "مبلغ خدمات نصب بازی آماده پرداخت است",
      message: `مبلغ نهایی درخواست ${appointment.trackingCode}: ${appointment.pricing.finalAmount.toLocaleString("fa-IR")} تومان. برای پرداخت، وارد جزئیات سفارش شوید.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: `/my-profile?step=5&ordersTab=games#appointment-${id}`,
      senderType: "admin",
      senderId: auth.userId,
      eventKey,
    }),
    deliverBusinessSms({
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
