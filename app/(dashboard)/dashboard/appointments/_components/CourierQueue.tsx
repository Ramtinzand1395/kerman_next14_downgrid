"use client";

import { MapPin, Phone, Truck } from "lucide-react";
import type { AppointmentItem, CourierStatus } from "@/types/appointments";
import {
  courierLabel,
  courierNext,
  courierTimeline,
  courierTone,
  formatTehranDate,
  getCourierView,
  statusLabel,
  statusTone,
  toman,
} from "./appointment-ui";

type Props = {
  items: AppointmentItem[];
  workingId: string;
  onOpenDetails: (item: AppointmentItem) => void;
  onRequestStatus: (item: AppointmentItem, status: CourierStatus) => void;
};

export default function CourierQueue({
  items,
  workingId,
  onOpenDetails,
  onRequestStatus,
}: Props) {
  const courierItems = items
    .map((item) => ({ item, courier: getCourierView(item) }))
    .filter(
      (
        value,
      ): value is {
        item: AppointmentItem;
        courier: NonNullable<ReturnType<typeof getCourierView>>;
      } => Boolean(value.courier),
    );

  if (courierItems.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Truck className="mx-auto h-11 w-11 text-slate-300" />
        <h2 className="mt-3 font-black text-slate-900">
          درخواستی در صف پیک نیست
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          فیلترها را تغییر دهید یا بعداً دوباره بررسی کنید.
        </p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {courierItems.map(({ item, courier }) => {
        const activeIndex = courierTimeline.indexOf(courier.status);
        return (
          <article
            key={item._id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] text-slate-400" dir="ltr">
                  {item.trackingCode}
                </p>
                <h2 className="mt-1 font-black text-slate-950">
                  {item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} ·{" "}
                  {item.device}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTehranDate(courier.pickupDate)}
                  {courier.pickupWindow.start
                    ? ` · ${courier.pickupWindow.start} تا ${courier.pickupWindow.end}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${courierTone[courier.status]}`}
                >
                  پیک: {courierLabel[courier.status]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusTone[item.status]}`}
                >
                  خدمت: {statusLabel[item.status]}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{courier.address.recipientName}</strong>
                <a
                  href={`tel:${courier.address.recipientPhone}`}
                  dir="ltr"
                  className="inline-flex items-center gap-1 font-bold text-[#001A6E]"
                >
                  <Phone className="h-4 w-4" />
                  {courier.address.recipientPhone}
                </a>
              </div>
              <p className="mt-2 flex gap-2 leading-6 text-slate-600">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {courier.address.city}، {courier.address.address}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                <span className="text-slate-500">
                  منطقه: {courier.regionTitle || "اعلام نشده"}
                </span>
                <strong>پیک قابل پرداخت: {toman(courier.shippingFinalAmount)}</strong>
              </div>
            </div>

            {courier.status !== "cancelled" ? (
              <ol
                className="mt-4 grid grid-cols-4 gap-1"
                aria-label="پیشرفت وضعیت پیک"
              >
                {courierTimeline.map((status, index) => (
                  <li key={status} className="min-w-0">
                    <div
                      className={`h-1.5 rounded-full ${
                        index <= activeIndex ? "bg-[#1269f5]" : "bg-slate-200"
                      }`}
                    />
                    <span
                      className={`mt-1 block truncate text-[9px] ${
                        index <= activeIndex
                          ? "font-bold text-[#001A6E]"
                          : "text-slate-400"
                      }`}
                    >
                      {courierLabel[status]}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {(courierNext[courier.status] || []).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={workingId === item._id}
                  onClick={() => onRequestStatus(item, status)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                    status === "cancelled"
                      ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                      : "bg-[#001A6E] text-white hover:bg-blue-900"
                  }`}
                >
                  {courierLabel[status]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onOpenDetails(item)}
                className="mr-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                جزئیات کامل
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
