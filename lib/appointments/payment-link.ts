import mongoose from "mongoose";
import Appointment from "@/model/Appointment";
import dbConnect from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/baseUrl";
import {
  appointmentPaymentCallback,
  reconcileAppointmentPayment,
  requestAppointmentGateway,
  validAppointmentAuthority,
  type AppointmentPaymentStatus,
} from "./payment-recovery";

type PaymentResult = { url: string } | { paymentStatus: AppointmentPaymentStatus } | { error: string; status: number };

export function isPayableAppointmentAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0 && Number.isSafeInteger(amount * 10);
}

export async function createAppointmentPaymentLink(id: string, userId: string, checkOnly: boolean): Promise<PaymentResult> {
  await dbConnect();
  if (!mongoose.isValidObjectId(id)) return { error: "شناسه درخواست نامعتبر است", status: 422 };
  const filter = { _id: id, user: userId };
  const current = await Appointment.findOne(filter).lean();
  if (!current) return { error: "درخواست پیدا نشد", status: 404 };
  if (checkOnly || current.payment?.status === "pending" || current.payment?.status === "paid") {
    return { paymentStatus: await reconcileAppointmentPayment(current) };
  }
  if (current.status !== "completed" || !current.pricing?.known) return { error: "ابتدا خدمات را تکمیل و مبلغ نهایی را ثبت کنید", status: 409 };
  const amount = current.pricing.finalAmount;
  if (!isPayableAppointmentAmount(amount)) {
    return { error: "مبلغ قابل پرداخت نامعتبر است", status: 422 };
  }
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return { error: "درگاه زرین‌پال پیکربندی نشده است", status: 503 };
  const claim = await Appointment.findOneAndUpdate({
    ...filter, status: "completed", "pricing.known": true, "pricing.finalAmount": amount,
    $or: [
      { "payment.status": { $exists: false } },
      { "payment.status": { $in: ["unpaid", "failed"] } },
      { "payment.status": "initiating", "payment.startedAt": { $lt: new Date(Date.now() - 120_000) } },
    ],
  }, { $set: { payment: { status: "initiating", amount, startedAt: new Date() } } }, { returnDocument: "after" });
  if (!claim) return { error: "درخواست پرداخت در حال آماده‌سازی است؛ دوباره تلاش کنید", status: 409 };
  const lock = { _id: id, "payment.status": "initiating", "payment.startedAt": claim.payment.startedAt };
  try {
    const result = await requestAppointmentGateway("request", {
      amount: amount * 10,
      callback_url: `${getSiteUrl()}${appointmentPaymentCallback}`,
      description: `خدمات کرمان آتاری ${current.trackingCode}`,
      metadata: { mobile: current.phone },
    });
    if (result?.code !== 100 || !validAppointmentAuthority(result.authority)) throw new Error("gateway request failed");
    const saved = await Appointment.updateOne(lock, {
      $set: {
        "payment.status": "pending",
        "payment.authority": result.authority,
        "payment.nextCheckAt": new Date(Date.now() + 60_000),
      },
    });
    if (!saved.modifiedCount) return { error: "وضعیت پرداخت هم‌زمان تغییر کرده است", status: 409 };
    return { url: `https://payment.zarinpal.com/pg/StartPay/${result.authority}` };
  } catch {
    await Appointment.updateOne(lock, { $set: { "payment.status": "failed" } });
    return { error: "ارتباط با زرین‌پال برقرار نشد؛ دوباره تلاش کنید", status: 502 };
  }
}
