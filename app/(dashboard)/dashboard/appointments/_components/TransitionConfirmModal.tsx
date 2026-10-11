"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import type { TransitionRequest } from "./admin-types";
import { courierLabel, statusLabel } from "./appointment-ui";

type Props = {
  request: TransitionRequest | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function TransitionConfirmModal({
  request,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  if (!request) return null;
  const label =
    request.kind === "courier"
      ? courierLabel[request.nextStatus]
      : statusLabel[request.nextStatus];
  const destructive =
    request.nextStatus === "cancelled" ||
    (request.kind === "appointment" &&
      ["rejected", "no_show"].includes(request.nextStatus));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="transition-confirm-title"
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              destructive
                ? "bg-rose-50 text-rose-600"
                : "bg-blue-50 text-[#1269f5]"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <button type="button" onClick={onClose} aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 id="transition-confirm-title" className="mt-4 font-black text-slate-950">
          تأیید تغییر وضعیت
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          وضعیت{" "}
          {request.kind === "courier" ? "پیک" : "خدمت"} درخواست{" "}
          <span className="font-mono" dir="ltr">
            {request.item.trackingCode}
          </span>{" "}
          به «{label}» تغییر می‌کند.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 font-bold"
          >
            بازگشت
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50 ${
              destructive ? "bg-rose-600" : "bg-[#001A6E]"
            }`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            تأیید تغییر
          </button>
        </div>
      </section>
    </div>
  );
}
