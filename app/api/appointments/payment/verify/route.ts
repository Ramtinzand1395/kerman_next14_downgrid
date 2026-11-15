import { NextResponse } from "next/server";
import Appointment from "@/model/Appointment";
import dbConnect from "@/lib/mongodb";
import { getSiteUrl } from "@/lib/baseUrl";
import {
  appointmentOrdersPath,
  reconcileAppointmentPayment,
  validAppointmentAuthority,
} from "@/lib/appointments/payment-recovery";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authority = new URL(req.url).searchParams.get("Authority");
  const fallback = new URL("/my-profile?step=5&ordersTab=games", getSiteUrl());
  fallback.searchParams.set("servicePayment", "pending");
  if (!validAppointmentAuthority(authority)) return NextResponse.redirect(fallback);

  try {
    await dbConnect();
    const appointment = await Appointment.findOne({ "payment.authority": authority }).lean();
    if (!appointment) return NextResponse.redirect(fallback);
    const destination = new URL(appointmentOrdersPath(String(appointment._id)), fallback);
    const status = await reconcileAppointmentPayment(appointment);
    destination.searchParams.set("servicePayment", status);
    return NextResponse.redirect(destination);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
