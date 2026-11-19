import { useState } from "react";
import { Printer } from "lucide-react";
import { sendPdfToBackend } from "@/helpers/sendPdfToBackend";
import type { Customer, storeOrder } from "@/types";

export default function PrintOrderButton({ order, customer }: { order: storeOrder | null; customer: Customer | null }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintQueued, setIsPrintQueued] = useState(false);

  const handlePrint = async () => {
    if (isPrinting || isPrintQueued) return;
    setIsPrinting(true);
    try {
      const queued = await sendPdfToBackend(order, customer);
      if (queued) setIsPrintQueued(true);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting || isPrintQueued}
      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Printer className="h-4 w-4" />
      {isPrinting ? "در حال ارسال..." : isPrintQueued ? "ارسال شد" : "پرینت"}
    </button>
  );
}
