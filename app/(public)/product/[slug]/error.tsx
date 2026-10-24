"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Product page failed to load", error);
  }, [error]);

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center px-4 py-12"
    >
      <section
        role="alert"
        className="w-full rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm md:p-10"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle aria-hidden="true" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">
          اطلاعات محصول بارگذاری نشد
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          ارتباط با سرویس محصول موقتاً دچار مشکل شده است. چند لحظه بعد دوباره
          تلاش کنید.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          تلاش دوباره
        </button>
      </section>
    </main>
  );
}
