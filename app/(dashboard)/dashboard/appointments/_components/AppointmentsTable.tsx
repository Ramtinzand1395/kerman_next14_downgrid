"use client";

import { courierNextStatuses, courierRouteLabel, courierStages, courierStageProgress } from "@/lib/appointments/courier-policy";

import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Store,
  Truck,
} from "lucide-react";
import type {
  AppointmentItem,
  AppointmentStatus,
  CourierStatus,
} from "@/types/appointments";
import {
  courierLabel,
  courierTone,
  formatTehranDate,
  getCourierView,
  statusLabel,
  statusTone,
  toman,
} from "./appointment-ui";

type Props = {
  items: AppointmentItem[];
  total: number;
  page: number;
  pages: number;
  workingId: string;
  onPageChange: (page: number) => void;
  onOpenDetails: (item: AppointmentItem) => void;
  onOpenSettlement: (item: AppointmentItem) => void;
  onRequestPayment: (item: AppointmentItem) => void;
  onRequestCourier: (item: AppointmentItem, status: CourierStatus) => void;
  onRequestStatus: (
    item: AppointmentItem,
    status: AppointmentStatus,
  ) => void;
};

export default function AppointmentsTable({
  items,
  total,
  page,
  pages,
  workingId,
  onPageChange,
  onOpenDetails,
  onOpenSettlement,
  onRequestPayment,
  onRequestCourier,
  onRequestStatus,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <CalendarEmptyIcon />
        <h2 className="mt-3 font-black text-slate-900">درخواستی پیدا نشد</h2>
        <p className="mt-1 text-sm text-slate-500">
          فیلترها را تغییر دهید یا بعداً دوباره بررسی کنید.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => {
          const courier = getCourierView(item);
          return (
            <article
              key={item._id}
              className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="font-mono text-[11px] text-slate-400"
                    dir="ltr"
                  >
                    {item.trackingCode}
                  </p>
                  <h2 className="mt-1 font-black text-slate-950">
                    {item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {item.device}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTehranDate(item.startsAt)}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusTone[item.status]}`}
                  >
                    خدمت: {statusLabel[item.status]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    {item.fulfillment === "courier" ? (
                      <Truck className="h-3.5 w-3.5" />
                    ) : (
                      <Store className="h-3.5 w-3.5" />
                    )}
                    {item.fulfillment === "courier" ? "پیک" : "حضوری"}
                  </span>
                </div>
              </div>
              {item.selectedGames?.length ? <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-[#001A6E]">{item.selectedGames.length.toLocaleString("fa-IR")} بازی · حجم ثبت‌شده: <span dir="ltr">{(item.totalSizeGB ?? 0).toLocaleString("fa-IR")} GB</span></p> : null}

              <dl className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] text-slate-400">مشتری</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {item.customerName}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">موبایل</dt>
                  <dd className="mt-1 flex items-center gap-2 font-bold" dir="ltr">
                    <a href={`tel:${item.phone}`} className="text-[#001A6E]">
                      {item.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(item.phone)}
                      aria-label="کپی شماره موبایل"
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-[#001A6E]"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </dd>
                </div>
                {courier ? (
                  <>
                    <div>
                      <dt className="text-[11px] text-slate-400">
                        وضعیت پیک
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ring-1 ring-inset ${courierTone[courier.status]}`}
                        >
                          {courierLabel[courier.status]}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-400">
                        هزینه نهایی پیک
                      </dt>
                      <dd className="mt-1 font-bold">
                        {toman(courier.shippingFinalAmount)}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>

              {item.description ? (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              ) : null}

              {courier && !["cancelled", "rejected", "no_show"].includes(item.status) && (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                  <p className="mb-2 text-xs font-black text-slate-700">مسیر سفارش</p>
                  <p className="mb-2 text-xs text-slate-600">{courierRouteLabel(courier.route)}</p>
                  <ol className="grid gap-1.5 text-center text-[10px] leading-5 sm:grid-cols-3 sm:text-xs">
                    {courierStages(courier.route).map((stage, index) => {
                      const progressed = index < courierStageProgress(courier.status, courier.route);
                      return <li key={stage.status} className={`rounded-xl p-2 ${progressed ? "bg-emerald-100 font-black text-emerald-900" : "bg-white text-slate-500"}`}>{stage.label}</li>;
                    })}
                  </ol>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {item.status === "pending" && (
                  <button type="button" disabled={workingId === item._id} onClick={() => courier ? onOpenSettlement(item) : onRequestStatus(item, "confirmed")} className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {courier ? "تأیید و ثبت مبلغ اولیه" : "تأیید درخواست"}
                  </button>
                )}
                {item.status === "confirmed" && (!courier || courier.route === "return" || ["picked_up", "at_store"].includes(courier.status)) && (
                  <button type="button" disabled={workingId === item._id} onClick={() => onOpenSettlement(item)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">ثبت مبلغ نهایی و ارسال لینک پرداخت</button>
                )}
                {courier && !["cancelled", "rejected", "no_show"].includes(item.status) && courierNextStatuses(courier.status, courier.route).filter((status) => status !== "cancelled" && status !== "return_ready" && !(status === "assigned" && (item.status !== "confirmed" || !item.pricing?.known))).map((status) => (
                  <button key={status} type="button" disabled={workingId === item._id} onClick={() => onRequestCourier(item, status)} className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {status === "assigned" ? "حرکت پیک برای دریافت" : status === "picked_up" ? "تحویل دستگاه به پیک" : status === "returning" ? "حرکت پیک برای برگشت" : courierLabel[status]}
                  </button>
                ))}
                {item.status === "completed" && item.payment?.status !== "paid" && Number(item.pricing?.finalAmount) > 0 && (
                  <button type="button" disabled={workingId === item._id} onClick={() => onRequestPayment(item)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">ساخت / کپی / ارسال لینک پرداخت</button>
                )}
                {["pending", "confirmed"].includes(item.status) && (!courier || ["pending", "scheduled"].includes(courier.status)) && item.payment?.status !== "paid" && (
                  <button type="button" disabled={workingId === item._id} onClick={() => onRequestStatus(item, "cancelled")} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">لغو سفارش</button>
                )}
                {item.pricing?.known && <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">پرداخت: {item.payment?.status === "paid" ? "موفق" : item.payment?.status === "pending" ? "در انتظار مشتری" : "پرداخت‌نشده"}{item.payment?.refId ? ` · پیگیری ${item.payment.refId}` : ""}</span>}
                <button
                  type="button"
                  onClick={() => onOpenDetails(item)}
                  className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#001A6E]"
                >
                  مشاهده جزئیات
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
        <span className="text-slate-500">
          {total.toLocaleString("fa-IR")} درخواست · صفحه{" "}
          {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
            قبلی
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40"
          >
            بعدی
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function CalendarEmptyIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
      —
    </div>
  );
}

