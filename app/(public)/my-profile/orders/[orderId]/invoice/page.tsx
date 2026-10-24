import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { getOrderForViewer } from "@/lib/orderAccess";
import { CURRENT_STORE_IDENTITY } from "@/lib/storeIdentity";
import OrderMoneySummaryView from "../../../../components/OrderMoneySummary";
import InvoicePrintButton from "./InvoicePrintButton";
import AutoPrintInvoice from "./AutoPrintInvoice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "فاکتور فروش",
  robots: { index: false, follow: false, nocache: true },
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tehran",
      }).format(new Date(value))
    : "ثبت نشده";

const paymentLabels: Record<string, string> = {
  zarinpal: "پرداخت اینترنتی",
  wallet: "کیف پول کرمان آتاری",
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
};

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { print?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(`/my-profile/orders/${params.orderId}/invoice`)}`,
    );
  }

  await dbConnect();
  const order = await getOrderForViewer({
    orderId: params.orderId,
    userId: session.user.id,
    role: session.user.role,
    paidOnly: true,
  });
  if (!order) notFound();

  const seller = order.seller || {
    ...CURRENT_STORE_IDENTITY,
    historicalFallback: true,
  };

  return (
    <main className="invoice-page mx-auto max-w-6xl px-3 py-6 sm:px-5 md:py-10">
      {searchParams.print === "1" && <AutoPrintInvoice />}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: #fff !important; color: #111827 !important; }
          body nav, body footer, .Toastify, .invoice-actions { display: none !important; }
          #content { margin: 0 !important; padding: 0 !important; }
          .invoice-page { max-width: none !important; padding: 0 !important; }
          .invoice-sheet { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .invoice-mobile { display: none !important; }
          .invoice-table { display: block !important; }
          .invoice-table thead { display: table-header-group; }
          .invoice-table tr { break-inside: avoid; page-break-inside: avoid; }
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="invoice-actions mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/my-profile?step=5" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
          <ArrowRight className="h-4 w-4" /> بازگشت به سفارش‌ها
        </Link>
        <InvoicePrintButton />
      </div>

      <article className="invoice-sheet overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <header className="flex flex-col gap-5 border-b-2 border-blue-950 p-5 sm:flex-row sm:items-center sm:justify-between md:p-7">
          <div className="flex items-center gap-4">
            <Image src="/atari-seeklogo.svg" alt="لوگوی کرمان آتاری" width={72} height={72} className="h-16 w-16 object-contain" />
            <div>
              <p className="text-sm font-bold text-blue-800">کرمان آتاری</p>
              <h1 className="text-2xl font-black text-slate-950">فاکتور فروش</h1>
              <p className="mt-1 text-[11px] text-slate-500">این سند، صورتحساب رسمی مالیاتی نیست.</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-slate-500">شماره فاکتور</dt><dd dir="ltr" className="font-mono font-bold text-slate-900">{order.invoiceNumber}</dd>
            <dt className="text-slate-500">تاریخ</dt><dd className="font-bold text-slate-900">{formatDate(order.payment.verifiedAt || order.createdAt)}</dd>
            <dt className="text-slate-500">کد پیگیری سفارش</dt><dd dir="ltr" className="font-mono font-bold text-slate-900">{order.trackingCode}</dd>
          </dl>
        </header>

        <div className="grid gap-0 border-b border-slate-300 md:grid-cols-2">
          <section className="p-5 md:border-l md:border-slate-300 md:p-6">
            <h2 className="text-sm font-black text-blue-950">مشخصات فروشنده</h2>
            <dl className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <div><dt className="inline font-bold">نام: </dt><dd className="inline">{seller.name}</dd></div>
              <div><dt className="inline font-bold">تلفن: </dt><dd dir="ltr" className="inline">{seller.phone}</dd></div>
              <div><dt className="inline font-bold">ایمیل: </dt><dd dir="ltr" className="inline">{seller.email}</dd></div>
              <div><dt className="inline font-bold">نشانی: </dt><dd className="inline">{seller.address}</dd></div>
            </dl>
            {seller.historicalFallback && <p className="mt-3 text-[11px] leading-5 text-amber-700">اطلاعات تاریخی فروشنده برای این سفارش قدیمی ذخیره نشده؛ اطلاعات تماس فعلی فروشگاه نمایش داده شده است.</p>}
          </section>

          <section className="border-t border-slate-300 p-5 md:border-t-0 md:p-6">
            <h2 className="text-sm font-black text-blue-950">مشخصات خریدار و گیرنده</h2>
            <dl className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <div><dt className="inline font-bold">خریدار: </dt><dd className="inline">{order.buyer?.name || order.address?.recipientName || "ثبت نشده"}</dd></div>
              <div><dt className="inline font-bold">تلفن: </dt><dd dir="ltr" className="inline">{order.address?.recipientMobile || order.buyer?.mobile || "ثبت نشده"}</dd></div>
              {order.address ? (
                <>
                  <div><dt className="inline font-bold">نشانی: </dt><dd className="inline">{order.address.province}، {order.address.city}، {order.address.address}{order.address.plaque ? `، پلاک ${order.address.plaque}` : ""}{order.address.unit ? `، واحد ${order.address.unit}` : ""}</dd></div>
                  {order.address.postalCode && <div><dt className="inline font-bold">کد پستی: </dt><dd className="inline">{order.address.postalCode}</dd></div>}
                </>
              ) : <p className="text-amber-700">اطلاعات تاریخی آدرس ثبت نشده است.</p>}
            </dl>
          </section>
        </div>

        <section className="p-4 md:p-6">
          <div className="invoice-mobile space-y-3 md:hidden">
            {order.items.map((item, index) => {
              const originalTotal = item.price * item.quantity;
              const discount = Math.max(0, originalTotal - item.total);
              return (
                <article key={item.id} className="rounded-xl border border-slate-300 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3"><h3 className="font-black text-slate-900">{index + 1}. {item.title}</h3><span className="shrink-0 text-slate-500">× {item.quantity}</span></div>
                  {item.variantAttributes?.length ? <p className="mt-1 text-xs text-slate-500">{item.variantAttributes.map((attribute) => `${attribute.label}: ${attribute.optionLabel}`).join(" · ")}</p> : item.variantTitle ? <p className="mt-1 text-xs text-slate-500">مدل: {item.variantTitle}</p> : null}
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-slate-500">کد کالا</dt><dd dir="ltr" className="font-bold">{item.sku || "—"}</dd></div>
                    <div><dt className="text-slate-500">قیمت واحد</dt><dd className="font-bold">{item.price.toLocaleString("fa-IR")}</dd></div>
                    <div><dt className="text-slate-500">تخفیف</dt><dd className="font-bold text-emerald-700">{discount.toLocaleString("fa-IR")}</dd></div>
                    <div><dt className="text-slate-500">مبلغ نهایی</dt><dd className="font-bold">{item.total.toLocaleString("fa-IR")} تومان</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="invoice-table hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="border border-blue-950 p-2">ردیف</th><th className="border border-blue-950 p-2">کد کالا / SKU</th><th className="border border-blue-950 p-2">شرح کالا و مدل</th><th className="border border-blue-950 p-2">تعداد</th><th className="border border-blue-950 p-2">قیمت واحد قبل تخفیف</th><th className="border border-blue-950 p-2">جمع قبل تخفیف</th><th className="border border-blue-950 p-2">تخفیف</th><th className="border border-blue-950 p-2">مبلغ نهایی</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => {
                  const originalTotal = item.price * item.quantity;
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                      <td dir="ltr" className="border border-slate-300 p-2 font-mono">{item.sku || "—"}</td>
                      <td className="border border-slate-300 p-2 font-bold">{item.title}{item.variantAttributes?.length ? ` — ${item.variantAttributes.map((attribute) => attribute.optionLabel).join("، ")}` : item.variantTitle ? ` — ${item.variantTitle}` : ""}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.quantity.toLocaleString("fa-IR")}</td>
                      <td className="border border-slate-300 p-2">{item.price.toLocaleString("fa-IR")}</td>
                      <td className="border border-slate-300 p-2">{originalTotal.toLocaleString("fa-IR")}</td>
                      <td className="border border-slate-300 p-2">{Math.max(0, originalTotal - item.total).toLocaleString("fa-IR")}</td>
                      <td className="border border-slate-300 p-2 font-black">{item.total.toLocaleString("fa-IR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 border-t border-slate-300 p-5 md:grid-cols-2 md:p-6">
          <section>
            <h2 className="text-sm font-black text-blue-950">پرداخت و ارسال</h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div><dt className="inline font-bold">روش پرداخت: </dt><dd className="inline">{paymentLabels[order.payment.gateway || ""] || "ثبت نشده"}</dd></div>
              {order.payment.referenceId && <div><dt className="inline font-bold">شماره مرجع پرداخت: </dt><dd dir="ltr" className="inline font-mono">{order.payment.referenceId}</dd></div>}
              <div><dt className="inline font-bold">زمان تأیید: </dt><dd className="inline">{formatDate(order.payment.verifiedAt)}</dd></div>
              <div><dt className="inline font-bold">وضعیت سفارش: </dt><dd className="inline">{statusLabels[order.status] || order.status}</dd></div>
              <div><dt className="inline font-bold">روش ارسال: </dt><dd className="inline">{order.shipping.title}</dd></div>
              <div><dt className="inline font-bold">هزینه حمل: </dt><dd className="inline">{order.shipping.label}</dd></div>
              <div><dt className="inline font-bold">مبلغ پرداخت‌شده آنلاین: </dt><dd className="inline">{order.payment.amountPaidOnlineToman.toLocaleString("fa-IR")} تومان</dd></div>
              {order.shipping.note && <p className="text-xs text-amber-700">{order.shipping.note}</p>}
            </dl>
          </section>
          <section className="rounded-xl border border-slate-300 p-4">
            <OrderMoneySummaryView summary={order.summary} shippingLabel={order.shipping.label} shippingNote={order.shipping.note} compact />
          </section>
        </div>

        {order.historicalFallback && (
          <p className="border-t border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            این سفارش قدیمی snapshot کامل همه اطلاعات را ندارد. موارد بازیابی‌شده از داده فعلی با این هشدار نمایش داده می‌شوند و به‌عنوان اطلاعات قطعی زمان خرید تلقی نمی‌شوند.
          </p>
        )}
      </article>
    </main>
  );
}
