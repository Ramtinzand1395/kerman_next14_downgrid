import { Suspense } from "react";
import { PageLoading } from "@/app/components/loading/LoadingSystem";
import AllStoreOrders from "./All";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AllStoreOrders />
    </Suspense>
  );
}
