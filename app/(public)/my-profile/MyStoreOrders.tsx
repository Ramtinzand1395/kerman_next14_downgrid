"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, Printer, RefreshCcw } from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import OrderMoneySummaryView from "../components/OrderMoneySummary";
import type { OrderDto } from "@/lib/orderDto";

const orderLabels: Record<string, string> = {
  initiated: "در انتظار پرداخت",
  paid_pending: "پرداخت در حال بررسی",
  refund_required: "نیازمند بررسی بازپرداخت",
  pending: "در انتظار بررسی",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
};

const paymentLabels: Record<string, string> = {
  unpaid: "پرداخت‌نشده",
  review: "در حال بررسی",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  pending_refund: "در انتظار بازپرداخت",
};

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(value))
    : "—";

export default function MyStoreOrders() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/orders", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "خطا در دریافت سفارش‌ها");
      }
      setOrders(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت سفارش‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")),
    [orders],
  );

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)}</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <p>{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 font-bold text-white">
          <RefreshCcw className="h-4 w-4" /> تلاش دوباره
        </button>
      </div>
    );
  }

  if (!sorted.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-lg font-black text-slate-800">هنوز سفارش محصولی ثبت نکرده‌اید</p><Link href="/products" className="mt-4 inline-block rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white">مشاهده محصولات</Link></div>;
  }

  return (
    <section className="space-y-4">
      {sorted.map((order) => {
        const isExpanded = expanded === order.id;
        return (
          <article key={`${order.source}:${order.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">{order.source === "order" ? "شماره سفارش" : "تلاش پرداخت"}</p>
                <p dir="ltr" className="mt-1 font-mono text-sm font-black text-slate-900">{order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
              </div>
              <div><p className="text-xs text-slate-500">تاریخ ثبت</p><p className="mt-1 text-sm font-bold text-slate-800">{date(order.createdAt)}</p></div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">پرداخت: {paymentLabels[order.payment.status] || order.payment.status}</span>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">سفارش: {orderLabels[order.status] || order.status}</span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {order.items.map((item) => (
                  <div key={item.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" title={item.title}>
                    <ProductImage src={item.image || "/atari-seeklogo.svg"} alt={item.title} fill sizes="64px" className="object-contain p-1" />
                    <span className="absolute bottom-1 right-1 rounded-full bg-blue-950 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.quantity.toLocaleString("fa-IR")}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <p className="text-slate-500">تعداد اقلام: <span className="font-bold text-slate-900">{order.summary.itemCount.toLocaleString("fa-IR")}</span></p>
                <p className="text-slate-500">مبلغ: <span className="font-bold text-slate-900">{order.summary.payable.toLocaleString("fa-IR")} تومان</span></p>
                <p className="text-slate-500">ارسال: <span className="font-bold text-slate-900">{order.shipping.label}</span></p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setExpanded(isExpanded ? null : order.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">
                  جزئیات سفارش <ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {order.invoiceEligible && (
                  <>
                    <Link href={`/my-profile/orders/${order.id}/invoice`} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-bold text-white"><FileText className="h-4 w-4" /> مشاهده فاکتور</Link>
                    <Link href={`/my-profile/orders/${order.id}/invoice?print=1`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-900"><Printer className="h-4 w-4" /> چاپ فاکتور</Link>
                  </>
                )}
              </div>

              {isExpanded && (
                <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    {order.address && <section className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><h3 className="font-black text-slate-900">آدرس تحویل</h3><p className="mt-2">{order.address.province}، {order.address.city}، {order.address.address}{order.address.plaque ? `، پلاک ${order.address.plaque}` : ""}{order.address.unit ? `، واحد ${order.address.unit}` : ""}</p></section>}
                    <section className="space-y-2">
                      <h3 className="font-black text-slate-900">محصولات</h3>
                      {order.items.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.variantTitle ? `مدل ${item.variantTitle} · ` : ""}تعداد {item.quantity.toLocaleString("fa-IR")} · {item.total.toLocaleString("fa-IR")} تومان</p></div>)}
                    </section>
                  </div>
                  <div className="space-y-4">
                    <section className="rounded-xl border border-slate-200 p-4"><h3 className="mb-4 font-black text-slate-900">مبالغ سفارش</h3><OrderMoneySummaryView summary={order.summary} shippingLabel={order.shipping.label} shippingNote={order.shipping.note} compact /></section>
                    <section className="rounded-xl bg-slate-50 p-4 text-sm"><h3 className="font-black text-slate-900">رسید پرداخت</h3><p className="mt-2 text-slate-600">وضعیت: {paymentLabels[order.payment.status] || order.payment.status}</p>{order.payment.referenceId && <p className="mt-1 text-slate-600">شماره مرجع: <span dir="ltr" className="font-mono font-bold text-slate-900">{order.payment.referenceId}</span></p>}</section>
                    {order.historicalFallback && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">بخشی از اطلاعات این سفارش قدیمی snapshot کامل زمان خرید را ندارد.</p>}
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
