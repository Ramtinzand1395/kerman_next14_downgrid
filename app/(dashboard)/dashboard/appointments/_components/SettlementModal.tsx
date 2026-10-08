"use client";

import { Check, Loader2, X } from "lucide-react";
import type { AppointmentItem } from "@/types/appointments";
import {
  getCourierView,
  selectedRewardLabel,
  toman,
} from "./appointment-ui";

type Props = {
  item: AppointmentItem | null;
  amount: string;
  submitting: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function SettlementModal({
  item,
  amount,
  submitting,
  onAmountChange,
  onClose,
  onSubmit,
}: Props) {
  if (!item) return null;
  const courier = getCourierView(item);
  const reward = selectedRewardLabel(item);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-title"
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="settlement-title" className="font-black text-slate-950">
              تکمیل و تسویه
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">
              {item.trackingCode}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-950">
          فقط مبلغ واقعی خدمت ارسال می‌شود؛ تمام تخفیف‌ها و جمع نهایی را سرور
          محاسبه و ذخیره می‌کند.
        </p>

        {courier ? (
          <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt>هزینه رفت‌وبرگشت پیک</dt>
              <dd className="font-bold">{toman(courier.shippingBaseAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>تخفیف ارسال</dt>
              <dd className="font-bold text-rose-600">
                {toman(courier.shippingDiscountAmount)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-bold">پیک قابل پرداخت</dt>
              <dd className="font-black">
                {toman(courier.shippingFinalAmount)}
              </dd>
            </div>
          </dl>
        ) : null}

        <label className="mt-4 block text-sm font-bold text-slate-700">
          مبلغ خدمت (تومان)
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {reward ? (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4">
            <p className="text-xs text-amber-700">پاداش رزروشده</p>
            <p className="font-bold text-amber-950">{reward}</p>
          </div>
        ) : null}

        <p className="mt-4 text-xs leading-6 text-slate-500">
          نتیجه نهایی مالی بعد از پاسخ سرور در جزئیات درخواست نمایش داده
          می‌شود.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 font-bold"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={submitting || amount === ""}
            onClick={onSubmit}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#001A6E] font-bold text-white disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            ثبت تسویه
          </button>
        </div>
      </section>
    </div>
  );
}

