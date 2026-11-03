import mongoose from "mongoose";
import Appointment from "@/model/Appointment";
import { requireUser, fail, ok, withRateLimit } from "@/lib/loyalty/api";
import { getSiteUrl } from "@/lib/baseUrl";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const limited = withRateLimit(`appointment-pay:${auth.userId}`, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه درخواست نامعتبر است", 422);
  const current = await Appointment.findOne({ _id: id, user: auth.userId }).lean();
  if (!current) return fail("درخواست پیدا نشد", 404);
  if (current.payment?.status === "paid") return fail("این درخواست قبلاً پرداخت شده است", 409);
  if (current.status !== "completed" || !current.pricing?.known) return fail("مبلغ نهایی هنوز ثبت نشده است", 409);
  if (current.payment?.status === "pending" && current.payment.authority) {
    return ok({ url: `https://payment.zarinpal.com/pg/StartPay/${current.payment.authority}` });
  }
  const amount = current.pricing.finalAmount;
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount * 10)) return fail("مبلغ قابل پرداخت نامعتبر است", 422);
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return fail("درگاه پرداخت پیکربندی نشده است", 503);
  // Lock the reviewed price before calling the gateway. Repeated clicks reuse pending authority.
  const claim = await Appointment.findOneAndUpdate({
    _id: id, user: auth.userId, status: "completed", "pricing.finalAmount": amount,
    $or: [
      { "payment.status": { $exists: false } },
      { "payment.status": { $in: ["unpaid", "failed"] } },
      { "payment.status": "initiating", "payment.startedAt": { $lt: new Date(Date.now() - 120_000) } },
    ],
  }, { $set: { payment: { status: "initiating", amount, startedAt: new Date() } } }, { returnDocument: "after" });
  if (!claim) return fail("پرداخت در حال آماده‌سازی است؛ کمی بعد دوباره تلاش کنید", 409);
  const startedAt = claim.payment.startedAt;
  const lock = { _id: id, "payment.status": "initiating", "payment.startedAt": startedAt };
  try {
    const response = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, amount: amount * 10,
        callback_url: `${getSiteUrl()}/api/appointments/payment/verify`,
        description: `خدمات کرمان آتاری ${current.trackingCode}`, metadata: { mobile: current.phone } }),
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok || result.data?.code !== 100 || !/^A[0-9A-Za-z]+$/.test(result.data?.authority || "")) throw new Error("gateway request failed");
    const saved = await Appointment.updateOne(lock, { $set: { "payment.status": "pending", "payment.authority": result.data.authority } });
    if (!saved.modifiedCount) return fail("وضعیت پرداخت تغییر کرده است؛ دوباره تلاش کنید", 409);
    return ok({ url: `https://payment.zarinpal.com/pg/StartPay/${result.data.authority}` });
  } catch {
    await Appointment.updateOne(lock, { $set: { "payment.status": "failed" } });
    return fail("اتصال به درگاه برقرار نشد؛ دوباره تلاش کنید", 502);
  }
}
