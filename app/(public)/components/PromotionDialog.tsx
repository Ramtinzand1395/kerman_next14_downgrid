"use client";

import Link from "@/app/components/navigation/NavigationFeedback";
import { useEffect, useId, useRef, useState } from "react";
import { X, Copy, Check, ArrowLeft } from "lucide-react";
import type { PromotionOffer } from "@/lib/promotions/policy";

export default function PromotionDialog({ offer, onClose, preview = false }: {
  offer: PromotionOffer;
  onClose: () => void;
  preview?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previous; };
  }, []);

  async function copyCode() {
    try { await navigator.clipboard.writeText(offer.code); setCopyState("copied"); }
    catch { setCopyState("failed"); }
  }

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={bodyId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}
      dir="rtl" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">
      <div className="relative overflow-hidden">
        <div className="bg-[#071827] px-7 pb-8 pt-14 text-white">
          <button type="button" onClick={onClose} autoFocus aria-label="بستن پیشنهاد"
            className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
            <X size={20} aria-hidden="true" />
          </button>
          <p className="mb-3 inline-block rounded-full bg-cyan-300/15 px-3 py-1 text-sm font-bold text-cyan-200">{offer.discountLabel}</p>
          <h2 id={titleId} className="text-2xl font-black leading-relaxed">{offer.title}</h2>
        </div>
        <div className="space-y-5 px-6 py-6">
          <p id={bodyId} className="whitespace-pre-line text-sm leading-8 text-slate-700">{offer.body}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-cyan-500 bg-cyan-50 p-4">
            <div><p className="mb-1 text-xs text-slate-600">کد تخفیفت</p><span dir="ltr" className="select-all font-mono text-xl font-black tracking-wider">{offer.code}</span></div>
            <button type="button" onClick={copyCode} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600">
              {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
              <span aria-live="polite">{copyState === "copied" ? "کپی شد" : "کپی کد"}</span>
            </button>
          </div>
          {copyState === "failed" && <p role="status" className="text-xs text-slate-600">کد را انتخاب و کپی کن: <span dir="ltr">{offer.code}</span></p>}
          <ul className="space-y-1 text-xs leading-6 text-slate-500">{offer.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
          <Link href={offer.ctaHref} onClick={(event) => { if (preview) event.preventDefault(); onClose(); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950">
            {offer.ctaLabel}<ArrowLeft size={17} aria-hidden="true" />
          </Link>
          <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl text-sm text-slate-500 hover:bg-slate-50">{offer.dismissLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
