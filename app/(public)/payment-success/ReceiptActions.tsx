"use client";

import { Printer } from "lucide-react";

export default function ReceiptActions() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50"
    >
      <Printer className="h-4 w-4" />
      چاپ / ذخیره PDF
    </button>
  );
}
