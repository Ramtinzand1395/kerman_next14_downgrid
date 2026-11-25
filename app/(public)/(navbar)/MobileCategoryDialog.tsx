"use client";

import { useEffect, useRef, type MouseEventHandler } from "react";
import { ArrowRight } from "lucide-react";
import CategoryBrowser from "./CategoryBrowser";

export default function MobileCategoryDialog({
  id,
  onBack,
  onLinkClick,
}: {
  id: string;
  onBack: () => void;
  onLinkClick: MouseEventHandler<HTMLAnchorElement>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-label="دسته‌بندی محصولات"
      onCancel={event => {
        event.preventDefault();
        onBack();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-white p-0 text-slate-900"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex items-center gap-2 border-b border-slate-200 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت به صفحه"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <h2 className="text-base font-extrabold text-blue-900">دسته‌بندی محصولات</h2>
        </div>
        <CategoryBrowser onLinkClick={onLinkClick} />
      </div>
    </dialog>
  );
}
