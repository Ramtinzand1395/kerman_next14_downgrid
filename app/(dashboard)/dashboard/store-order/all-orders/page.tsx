import { Suspense } from "react";
import AllStoreOrders from "./All";

export default function Page() {
  return (
    <Suspense fallback={<div>در حال بارگذاری...</div>}>
      <AllStoreOrders />
    </Suspense>
  );
}
