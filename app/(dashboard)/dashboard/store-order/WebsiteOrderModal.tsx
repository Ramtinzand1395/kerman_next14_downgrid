"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/app/components/navigation/NavigationFeedback";
import type { AppointmentItem } from "@/types/appointments";
import type { Customer, OrdersByConsole } from "@/types";
import AddOrderModal from "./modals/addorder/AddOrderModal";

type Props = {
  setOrders: Dispatch<SetStateAction<OrdersByConsole>>;
  onSaved: () => void;
};

export default function WebsiteOrderModal(props: Props) {
  const id = useSearchParams().get("appointment");
  return id ? <WebsiteOrderLoader key={id} id={id} {...props} /> : null;
}

function WebsiteOrderLoader({ id, setOrders, onSaved }: Props & { id: string }) {
  const router = useRouter();
  const [result, setResult] = useState<{ appointment: AppointmentItem; customer?: Customer }>();
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const options = { signal: controller.signal, cache: "no-store" as const };
        const response = await fetch(`/api/admin/appointments/${encodeURIComponent(id)}`, options);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "سفارش سایت دریافت نشد.");
        const appointment: AppointmentItem = payload.data;
        if (appointment.status !== "confirmed" || (appointment.fulfillment === "courier" && appointment.courier?.status !== "at_store")) {
          throw new Error("این سفارش در مرحله ثبت یا ویرایش سفارش دستی نیست.");
        }
        const customerResponse = await fetch(`/api/admin/store-order/customer?${new URLSearchParams({ mobile: appointment.phone })}`, options);
        const customerPayload = await customerResponse.json();
        if (!customerResponse.ok && !(customerResponse.status === 400 && customerPayload.message === "خریدار پیدا نشد.")) {
          throw new Error(customerPayload.message || "اطلاعات مشتری دریافت نشد.");
        }
        setResult({ appointment, customer: customerPayload.data });
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "سفارش سایت دریافت نشد.");
      }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  const close = () => router.replace("/dashboard/store-order", { scroll: false });

  if (!result) {
    return (
      <div role={error ? "alert" : "status"} className="flex items-center justify-between rounded-xl border bg-white p-4 text-sm">
        {error || "در حال آماده‌سازی فرم سفارش سایت…"}
        <button type="button" onClick={close} className="rounded-lg border px-3 py-1">بستن</button>
      </div>
    );
  }

  return <AddOrderModal {...result} closeModal={close} setOrders={setOrders} onWebsiteOrderSaved={onSaved} />;
}
