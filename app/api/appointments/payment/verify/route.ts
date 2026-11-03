import { NextResponse } from "next/server";
import Appointment from "@/model/Appointment";
import dbConnect from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/baseUrl";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await dbConnect();
  const query = new URL(req.url).searchParams;
  const authority = query.get("Authority") || "";
  const destination = new URL("/my-profile?step=5&ordersTab=games", getSiteUrl());
  const redirect = (status: string) => {
    destination.searchParams.set("servicePayment", status);
    return NextResponse.redirect(destination);
  };
  if (!/^A[0-9A-Za-z]+$/.test(authority)) return redirect("failed");
  const appointment = await Appointment.findOne({ "payment.authority": authority }).lean();
  if (!appointment) return redirect("failed");
  if (appointment.payment.status === "paid") return redirect("paid");
  if (query.get("Status") !== "OK") {
    // Query parameters are untrusted: cancellation alone cannot release the payment lock.
    return redirect("failed");
  }
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return redirect("pending");
  try {
    const response = await fetch("https://payment.zarinpal.com/pg/v4/payment/verify.json", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, authority, amount: appointment.payment.amount * 10 }),
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok || ![100, 101].includes(result.data?.code)) return redirect("pending");
    // Atomic confirmation makes duplicate gateway callbacks harmless.
    const paid = await Appointment.findOneAndUpdate({
      _id: appointment._id, "payment.authority": authority, "payment.status": { $ne: "paid" },
    }, { $set: { "payment.status": "paid", "payment.paidAt": new Date(), "payment.refId": String(result.data.ref_id) } }, { returnDocument: "after" });
    if (paid) {
      const common = {
        title: "پرداخت خدمات انجام شد", message: `مبلغ ${appointment.payment.amount.toLocaleString("fa-IR")} تومان برای درخواست ${appointment.trackingCode} پرداخت شد.`,
        type: "REQUEST_STATUS_CHANGED" as const, category: "request" as const,
        entityType: "Appointment", entityId: appointment._id,
        eventKey: `APPOINTMENT_PAID:${appointment._id}:${authority}`,
      };
      await Promise.allSettled([
        notifyUser({ ...common, userId: appointment.user, link: "/my-profile?step=5&ordersTab=games" }),
        notifyAdmins({ ...common, link: "/dashboard/appointments?fulfillment=courier" }),
      ]);
    }
    return redirect("paid");
  } catch {
    // Network uncertainty never marks a successful gateway payment as failed.
    return redirect("pending");
  }
}
