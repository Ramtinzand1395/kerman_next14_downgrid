"use client";

import { useEffect } from "react";

export default function AutoPrintInvoice() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
