import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import InstallationGameSummary from "@/app/components/games/InstallationGameSummary";
import { formatPrice } from "@/helpers/Price";
import { isCopyCourierInstallation } from "@/lib/appointments/games";
import dbConnect from "@/lib/mongodb";
import Appointment from "@/model/Appointment";
import type { AppointmentItem } from "@/types/appointments";
import InvoicePrintButton from "../../../orders/[orderId]/invoice/InvoicePrintButton";

export const metadata = { title: "صورتحساب نصب بازی", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GameOrderInvoice({ params }: { params: { appointmentId: string } }) {
  const { appointmentId } = params;
  if (!/^[a-f\d]{24}$/i.test(appointmentId)) notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/my-profile/game-orders/${appointmentId}/invoice`)}`);
  }

  await dbConnect();
  const item = await Appointment.findOne({
    _id: appointmentId, user: session.user.id, reservationFinalizedAt: { $ne: null },
  }).select("customerName trackingCode fulfillment serviceType device installationType status startsAt selectedGames pricing payment.status payment.refId").lean<AppointmentItem>();
  if (!item || !isCopyCourierInstallation(item) || item.pricing?.finalAmount == null) notFound();
  const { pricing } = item;
  const rows = [
    { title: "مبلغ خدمت", amount: pricing.serviceBaseAmount ?? pricing.baseAmount },
    { title: "هزینه پیک", amount: pricing.shippingBaseAmount },
    { title: "تخفیف نصب", amount: -(pricing.serviceDiscountAmount ?? 0) },
    { title: "تخفیف پیک", amount: -(pricing.shippingDiscountAmount ?? 0) },
  ];

  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-8">
      <style>{`@media print { nav, footer, .game-invoice-actions { display: none !important; } }`}</style>
      <div className="game-invoice-actions mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-bold text-blue-900" href={`/my-profile?step=5&ordersTab=games#appointment-${appointmentId}`}>بازگشت به سفارش</Link>
        <InvoicePrintButton />
      </div>
      <article className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <header>
          <h1 className="text-2xl font-black text-slate-900">{item.status === "completed" ? "صورتحساب نصب بازی" : "صورتحساب اولیه نصب بازی"}</h1>
          <p className="mt-2 text-sm text-slate-600">کرمان آتاری · {item.customerName} · <bdi>{item.trackingCode}</bdi></p>
          {item.payment?.status === "paid" && <p className="mt-2 text-sm font-bold text-emerald-700">پرداخت موفق {item.payment.refId && <bdi>{item.payment.refId}</bdi>}</p>}
          {["cancelled", "rejected", "no_show"].includes(item.status) && <p className="mt-2 text-sm font-bold text-rose-700">سفارش بسته شده است.</p>}
        </header>
        <InstallationGameSummary games={item.selectedGames} showPrices />
        <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          {rows.map(({ title, amount }) => amount != null && (
            <div key={title} className="flex justify-between gap-3">
              <dt>{title}</dt><dd className="font-bold">{formatPrice(amount)} تومان</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-black text-blue-950">
            <dt>جمع صورتحساب</dt><dd>{formatPrice(pricing.finalAmount ?? 0)} تومان</dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
