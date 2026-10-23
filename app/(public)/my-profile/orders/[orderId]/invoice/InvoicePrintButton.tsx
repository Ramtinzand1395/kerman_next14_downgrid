"use client";

import { Printer } from "lucide-react";

export default function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white"
    >
      <Printer className="h-4 w-4" />
      چاپ / ذخیره PDF
    </button>
  );
}
