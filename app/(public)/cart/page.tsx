export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CartPage from "./CartPage";

export default function page() {
  return (
    <Suspense fallback={<div className="p-10">در حال بارگذاری...</div>}>
      <CartPage />
    </Suspense>
  );
}
