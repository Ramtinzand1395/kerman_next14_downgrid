"use client";

import { useEffect } from "react";
import {
  Check,
  Clipboard,
  MapPin,
  Phone,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import type { AppointmentItem } from "@/types/appointments";
import {
  courierLabel,
  courierTimeline,
  courierTone,
  formatTehranDate,
  getCourierView,
  selectedRewardLabel,
  statusLabel,
  statusTone,
  toman,
} from "./appointment-ui";

type Props = {
  item: AppointmentItem | null;
  onClose: () => void;
};

export default function AppointmentDetailsDrawer({ item, onClose }: Props) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const courier = getCourierView(item);
  const activeCourierIndex = courier
    ? courierTimeline.indexOf(courier.status)
    : -1;
  const selectedReward =
    item.rewardSummary?.selectedReward || item.selectedReward;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-detail-title"
        className="mr-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
          <div>
            <h2 id="appointment-detail-title" className="font-black text-slate-950">
              جزئیات درخواست
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">
              {item.trackingCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن جزئیات"
            className="rounded-xl p-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900">
                  {item.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} ·{" "}
                  {item.device}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTehranDate(item.startsAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusTone[item.status]}`}
                >
                  خدمت: {statusLabel[item.status]}
                </span>
                {courier ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${courierTone[courier.status]}`}
                  >
                    پیک: {courierLabel[courier.status]}
                  </span>
                ) : null}
              </div>
            </div>
            {item.description ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-900">مشتری</h3>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">{item.customerName}</p>
                <a
                  href={`tel:${item.phone}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-[#001A6E]"
                  dir="ltr"
                >
                  <Phone className="h-4 w-4" />
                  {item.phone}
                </a>
              </div>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(item.phone)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
              >
                <Clipboard className="h-4 w-4" />
                کپی شماره
              </button>
            </div>
            {item.customerSummary ? (
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                <div>
                  <dt className="text-[11px] text-slate-400">کل مراجعات</dt>
                  <dd className="font-black">
                    {item.customerSummary.totalCompletedVisits.toLocaleString(
                      "fa-IR",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">نصب بازی</dt>
                  <dd className="font-black">
                    {item.customerSummary.gameInstallVisits.toLocaleString(
                      "fa-IR",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">تعمیر</dt>
                  <dd className="font-black">
                    {item.customerSummary.repairVisits.toLocaleString("fa-IR")}
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>

          {courier ? (
            <section className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
              <h3 className="flex items-center gap-2 font-black text-slate-900">
                <Truck className="h-5 w-5 text-cyan-700" />
                دریافت و بازگشت با پیک
              </h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-400">تحویل‌گیرنده</dt>
                  <dd className="font-bold">{courier.address.recipientName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">شماره تماس</dt>
                  <dd className="font-bold" dir="ltr">
                    {courier.address.recipientPhone}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400">آدرس</dt>
                  <dd className="mt-1 flex gap-2 font-bold leading-7">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />
                    {courier.address.city}، {courier.address.address}
                  </dd>
                </div>
              </dl>
              {courier.status === "cancelled" ? (
                <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
                  فرایند پیک لغو شده است.
                </p>
              ) : (
                <ol className="mt-5 space-y-0" aria-label="خط زمانی پیک">
                  {courierTimeline.map((status, index) => {
                    const completed = index <= activeCourierIndex;
                    return (
                      <li key={status} className="relative flex gap-3 pb-4 last:pb-0">
                        {index < courierTimeline.length - 1 ? (
                          <span
                            className={`absolute right-[9px] top-5 h-full w-0.5 ${
                              index < activeCourierIndex
                                ? "bg-emerald-300"
                                : "bg-slate-200"
                            }`}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span
                          className={`relative z-[1] mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            completed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {completed ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span
                          className={`text-sm ${
                            completed
                              ? "font-bold text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {courierLabel[status]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="flex items-center gap-2 font-black text-slate-900">
              <Sparkles className="h-5 w-5 text-amber-500" />
              باشگاه مشتریان
            </h3>
            {selectedReward ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="font-bold text-amber-950">
                  {selectedReward.snapshot?.title || "پاداش انتخاب‌شده"}
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {selectedRewardLabel(item)}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  وضعیت:{" "}
                  {selectedReward.status === "reserved"
                    ? "رزرو شده"
                    : selectedReward.status || "اعلام نشده"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                پاداشی برای این درخواست انتخاب نشده است.
              </p>
            )}
            {item.rewardSummary?.progress?.length ? (
              <div className="mt-3 space-y-2">
                {item.rewardSummary.progress.map((progress) => (
                  <div
                    key={progress.ruleId}
                    className="rounded-xl bg-slate-50 p-3 text-xs"
                  >
                    <p className="font-bold text-slate-800">{progress.title}</p>
                    <p className="mt-1 text-slate-500">
                      {progress.completedVisits.toLocaleString("fa-IR")} از{" "}
                      {progress.requiredVisits.toLocaleString("fa-IR")} مراجعه ·{" "}
                      {progress.remaining
                        ? `${progress.remaining.toLocaleString("fa-IR")} مراجعه مانده`
                        : "تکمیل‌شده"}
                    </p>
                    {progress.willEarnOnCompletion ? (
                      <p className="mt-1 font-bold text-emerald-700">
                        با تکمیل این درخواست پاداش صادر می‌شود.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-900">جزئیات مالی</h3>
            {item.pricing ? (
              <dl className="mt-3 space-y-2 text-sm">
                <PriceRow
                  label="هزینه خدمت"
                  value={
                    item.pricing.known
                      ? toman(
                          item.pricing.serviceBaseAmount ??
                            item.pricing.baseAmount,
                        )
                      : "پس از بررسی"
                  }
                />
                <PriceRow
                  label="تخفیف خدمت"
                  value={toman(item.pricing.serviceDiscountAmount ?? 0)}
                  discount
                />
                {courier ? (
                  <>
                    <PriceRow
                      label="هزینه رفت‌وبرگشت پیک"
                      value={toman(courier.shippingBaseAmount)}
                      separated
                    />
                    <PriceRow
                      label="تخفیف ارسال"
                      value={toman(courier.shippingDiscountAmount)}
                      discount
                    />
                    <PriceRow
                      label="پیک قابل پرداخت"
                      value={toman(courier.shippingFinalAmount)}
                    />
                  </>
                ) : null}
                <PriceRow
                  label="مبلغ نهایی"
                  value={
                    item.pricing.finalAmount === null
                      ? "پس از بررسی خدمت"
                      : toman(item.pricing.finalAmount)
                  }
                  total
                />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                اطلاعات مالی از سرور دریافت نشده است.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-900">تاریخچه تغییرات</h3>
            {item.history?.length ? (
              <ol className="mt-3 space-y-3">
                {item.history.map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="border-r-2 border-blue-100 pr-3"
                  >
                    <p className="text-sm font-bold">
                      {statusLabel[entry.to] || entry.to}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTehranDate(entry.at)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                تاریخچه‌ای ثبت نشده است.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function PriceRow({
  label,
  value,
  discount = false,
  separated = false,
  total = false,
}: {
  label: string;
  value: string;
  discount?: boolean;
  separated?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        separated || total ? "border-t border-slate-100 pt-2" : ""
      }`}
    >
      <dt className={total ? "font-bold text-slate-900" : "text-slate-500"}>
        {label}
      </dt>
      <dd
        className={`font-bold ${
          discount
            ? "text-rose-600"
            : total
              ? "text-emerald-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

