export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import CartPage from "./CartPage";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function page() {
  return (
    <Suspense fallback={<div className="p-10">در حال بارگذاری...</div>}>
      <CartPage />
    </Suspense>
  );
}
