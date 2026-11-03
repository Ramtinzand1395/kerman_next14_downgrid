import mongoose from "mongoose";
import Appointment from "@/model/Appointment";
import dbConnect from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/baseUrl";

type PaymentResult = { url: string } | { error: string; status: number };

export async function createAppointmentPaymentLink(id: string, userId?: string): Promise<PaymentResult> {
  await dbConnect();
  if (!mongoose.isValidObjectId(id)) return { error: "شناسه درخواست نامعتبر است", status: 422 };
  const filter = { _id: id, ...(userId ? { user: userId } : {}) };
  const current = await Appointment.findOne(filter).lean();
  if (!current) return { error: "درخواست پیدا نشد", status: 404 };
  if (current.payment?.status === "paid") return { error: "این درخواست قبلاً پرداخت شده است", status: 409 };
  if (current.status !== "completed" || !current.pricing?.known) return { error: "ابتدا خدمات را تکمیل و مبلغ نهایی را ثبت کنید", status: 409 };
  const amount = current.pricing.finalAmount;
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount * 10)) {
    return { error: "مبلغ قابل پرداخت نامعتبر است", status: 422 };
  }
  if (current.payment?.status === "pending" && current.payment.authority) {
    return { url: `https://payment.zarinpal.com/pg/StartPay/${current.payment.authority}` };
  }
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return { error: "درگاه زرین‌پال پیکربندی نشده است", status: 503 };
  const claim = await Appointment.findOneAndUpdate({
    ...filter, status: "completed", "pricing.finalAmount": amount,
    $or: [
      { "payment.status": { $exists: false } },
      { "payment.status": { $in: ["unpaid", "failed"] } },
      { "payment.status": "initiating", "payment.startedAt": { $lt: new Date(Date.now() - 120_000) } },
    ],
  }, { $set: { payment: { status: "initiating", amount, startedAt: new Date() } } }, { returnDocument: "after" });
  if (!claim) return { error: "درخواست پرداخت در حال آماده‌سازی است؛ دوباره تلاش کنید", status: 409 };
  const lock = { _id: id, "payment.status": "initiating", "payment.startedAt": claim.payment.startedAt };
  try {
    const response = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId, amount: amount * 10,
        callback_url: `${getSiteUrl()}/api/appointments/payment/verify`,
        description: `خدمات کرمان آتاری ${current.trackingCode}`,
        metadata: { mobile: current.phone },
      }),
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok || result.data?.code !== 100 || !/^A[0-9A-Za-z]+$/.test(result.data?.authority || "")) throw new Error("gateway request failed");
    const saved = await Appointment.updateOne(lock, { $set: { "payment.status": "pending", "payment.authority": result.data.authority } });
    if (!saved.modifiedCount) return { error: "وضعیت پرداخت هم‌زمان تغییر کرده است", status: 409 };
    return { url: `https://payment.zarinpal.com/pg/StartPay/${result.data.authority}` };
  } catch {
    await Appointment.updateOne(lock, { $set: { "payment.status": "failed" } });
    return { error: "ارتباط با زرین‌پال برقرار نشد؛ دوباره تلاش کنید", status: 502 };
  }
}
