import type { Types } from "mongoose";
import Appointment from "@/model/Appointment";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";

export const appointmentPaymentCallback = "/api/appointments/payment/verify";
const gatewayBase = "https://payment.zarinpal.com/pg/v4/payment";

export const validAppointmentAuthority = (value: unknown): value is string =>
  typeof value === "string" && /^A[0-9A-Za-z]{1,63}$/.test(value);

export function appointmentOrdersPath(id: string) {
  return `/my-profile?step=5&ordersTab=games&appointment=${id}#appointment-${id}`;
}

export async function requestAppointmentGateway(
  action: "request" | "verify" | "inquiry",
  body: Record<string, unknown>,
) {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) throw new Error("Appointment payment merchant is missing");
  const response = await fetch(`${gatewayBase}/${action}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...body, merchant_id: merchantId }),
    cache: "no-store",
    signal: AbortSignal.timeout(action === "request" ? 20_000 : 8_000),
  });
  if (!response.ok && !(action === "verify" && response.status === 422)) throw new Error(`Appointment payment gateway HTTP ${response.status}`);
  const result = await response.json();
  return result?.data;
}

type PaymentAppointment = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fulfillment?: string;
  trackingCode: string;
  payment?: {
    status?: string;
    amount?: number | null;
    authority?: string | null;
    notificationPending?: boolean;
    startedAt?: Date | null;
  } | null;
};

export async function sendAppointmentPaidNotices(appointment: PaymentAppointment) {
  const payment = appointment.payment;
  if (!payment?.notificationPending || !validAppointmentAuthority(payment.authority) || typeof payment.amount !== "number") return;
  const common = {
    title: "پرداخت خدمات انجام شد",
    message: `مبلغ ${payment.amount.toLocaleString("fa-IR")} تومان برای درخواست ${appointment.trackingCode} پرداخت شد.`,
    type: "REQUEST_STATUS_CHANGED" as const,
    category: "request" as const,
    entityType: "Appointment",
    entityId: appointment._id,
    eventKey: `APPOINTMENT_PAID:${appointment._id}:${payment.authority}`,
  };
  const notices = await Promise.allSettled([
    notifyUser({ ...common, userId: appointment.user, link: appointmentOrdersPath(String(appointment._id)) }),
    notifyAdmins({ ...common, link: appointment.fulfillment === "courier" ? "/dashboard/appointments?fulfillment=courier" : "/dashboard/appointments" }),
  ]);
  if (notices.every((notice) => notice.status === "fulfilled")) {
    await Appointment.updateOne(
      { _id: appointment._id, "payment.status": "paid", "payment.authority": payment.authority },
      { $unset: { "payment.notificationPending": 1 } },
      { timestamps: false },
    );
  }
}

export type AppointmentPaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export async function reconcileAppointmentPayment(appointment: PaymentAppointment): Promise<AppointmentPaymentStatus> {
  const payment = appointment.payment;
  if (payment?.status === "paid" || payment?.status === "failed") return payment.status;
  if (payment?.status === "initiating") return "pending";
  if (payment?.status !== "pending") return "unpaid";

  const { amount, authority } = payment;
  if (!validAppointmentAuthority(authority) || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount * 10)) {
    return "pending";
  }
  const filter = {
    _id: appointment._id,
    "payment.status": "pending",
    "payment.authority": authority,
    "payment.amount": amount,
  };
  try {
    const verification = await requestAppointmentGateway("verify", { authority, amount: amount * 10 });
    if (verification?.code === 100 || verification?.code === 101) {
      const reference = verification.ref_id;
      if (!/^\d+$/.test(String(reference ?? "")) || !Number.isSafeInteger(Number(reference)) || Number(reference) <= 0) {
        return "pending";
      }
      const changed = await Appointment.findOneAndUpdate(filter, {
        $set: {
          "payment.status": "paid",
          "payment.refId": String(reference),
          "payment.paidAt": new Date(),
          "payment.notificationPending": true,
        },
        $unset: { "payment.nextCheckAt": 1 },
      }, { returnDocument: "after" }).lean();
      if (changed) {
        await sendAppointmentPaidNotices(changed).catch(() => {
          console.error("appointment.payment.notification_retry", String(appointment._id));
        });
        return "paid";
      }
    } else {
      const inquiry = await requestAppointmentGateway("inquiry", { authority });
      // Only the gateway can confirm the old attempt has ended. A timeout or an
      // unrecognized reply must leave the existing authority locked.
      if (inquiry?.code !== 100 || !["FAILED", "REVERSED"].includes(inquiry.status)) return "pending";
      const changed = await Appointment.updateOne(filter, {
        $set: { "payment.status": "failed" },
        $unset: { "payment.nextCheckAt": 1 },
      });
      if (changed.modifiedCount) return "failed";
    }

    const latest = await Appointment.findById(appointment._id).select("payment.status").lean();
    if (latest?.payment?.status === "paid" || latest?.payment?.status === "failed") return latest.payment.status;
    return "pending";
  } catch {
    return "pending";
  }
}
