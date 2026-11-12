"use client";

import Link from "next/link";
import { websiteOrderUrl } from "@/lib/appointments/store-order";
import { sendAppointmentPaymentLink } from "../appointments/_components/send-payment-link";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { storeOrder, OrdersByConsole } from "@/types";
import OrderSkeleton from "./modals/OrderSkeleton";
import UserInfoModal from "./modals/updateModal/UserInfoModal";

const statusOrder = ["دریافت از مشتری", "آماده", "تحویل به مشتری"] as const;

interface OrderTableProps {
  header: string;
  Orders: storeOrder[];
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
  consoleKey: keyof OrdersByConsole;
  onWebsiteOrderChanged: () => void;
  isLoading: boolean;
  setloadingSms: React.Dispatch<React.SetStateAction<boolean>>;
}

const statusColors: Record<string, string> = {
  "دریافت از مشتری": "bg-amber-100 text-amber-700 border-amber-300",
  آماده: "bg-sky-100 text-sky-700 border-sky-300",
  "تحویل به مشتری": "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const OrderTable = ({
  header,
  Orders,
  setOrders,
  consoleKey,
  isLoading,
  setloadingSms,
  onWebsiteOrderChanged,
}: OrderTableProps) => {
  const [selectedOrder, setSelectedOrder] = useState<storeOrder | null>(null);

  const [workingId, setWorkingId] = useState("");

  const countLabel = useMemo(
    () => `${Orders.length.toLocaleString("fa-IR")} سفارش`,
    [Orders.length],
  );

  const changeStatus = async (
    orderId: string,
    newStatus: storeOrder["deliveryStatus"],
  ) => {
    const order = Orders.find((o) => o._id === orderId);
    if (!order) return;

    const currentIndex = statusOrder.indexOf(
      order.deliveryStatus as (typeof statusOrder)[number],
    );
    const newIndex = statusOrder.indexOf(
      newStatus as (typeof statusOrder)[number],
    );

    if (newIndex <= currentIndex) {
      toast.warning("این تغییر وضعیت مجاز نیست؛ سفارش فقط می‌تواند به مرحله بعد برود.");
      return;
    }

    const confirmChange = window.confirm(
      `آیا از تغییر وضعیت به «${newStatus}» مطمئن هستید؟`,
    );
    if (!confirmChange) return;

    setloadingSms(true);
    setWorkingId(orderId);
    try {
      if (order.appointmentId) {
        if (newStatus !== "آماده" || order.serviceBaseAmount == null) {
          throw new Error("مبلغ خدمت را از فرم سفارش تکمیل کنید.");
        }
        const response = await fetch(`/api/admin/appointments/${order.appointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed", baseAmount: order.serviceBaseAmount, expectedUpdatedAt: order.updatedAt }),
        });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 409) onWebsiteOrderChanged();
          throw new Error(payload.error || "سفارش آماده نشد.");
        }
        toast.success("سفارش آماده شد.");
        if (payload.data?.storeOrderSmsStatus === "failed") {
          toast.warning("سفارش آماده شد، اما پیامک بررسی اعلان‌ها و پرداخت ارسال نشد.");
        }
        if (Number(payload.data?.pricing?.finalAmount) > 0) {
          try {
            toast.info(await sendAppointmentPaymentLink(order.appointmentId));
          } catch (reason) {
            toast.warning(reason instanceof Error ? `سفارش آماده شد. ${reason.message}` : "ارسال لینک پرداخت ناموفق بود.");
          }
        }
        onWebsiteOrderChanged();
        return;
      }
      const res = await fetch(
        `/api/admin/store-order/changestatus/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, sendSms: true }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOrders((prev) => ({
        ...prev,
        [consoleKey]: prev[consoleKey].map((item) =>
          item._id === orderId ? { ...item, deliveryStatus: newStatus } : item,
        ),
      }));

      toast.success(data.message || "وضعیت سفارش ذخیره شد.");

      if (data.sms?.state === "sent") {
        toast.success("پیامک تغییر وضعیت برای مشتری ارسال شد.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(err instanceof Error ? err.message : "وضعیت سفارش تغییر نکرد؛ دوباره تلاش کنید.");
    } finally {
      setloadingSms(false);
      setWorkingId("");
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-base font-bold text-slate-800 md:text-lg">
          {header}
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
          {countLabel}
        </span>
      </div>

      {isLoading ? (
        <OrderSkeleton rows={6} />
      ) : Orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          سفارشی برای این دستگاه ثبت نشده است.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-sm text-slate-600">
            <thead>
              <tr className="text-slate-500">
                <th className="px-2 py-2 text-right">مشتری</th>
                <th className="px-2 py-2 text-right">وضعیت سفارش</th>
                <th className="px-2 py-2 text-right">کد دریافت</th>
                <th className="px-2 py-2 text-right">مبلغ (تومان)</th>
                <th className="px-2 py-2 text-right">توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {Orders.map((order) => (
                <tr key={order._id} className="rounded-xl bg-slate-50">
                  <td className="rounded-r-xl px-2 py-3 text-slate-900">
                    {order.appointmentId ? (
                      <Link href={order.deliveryStatus === "آماده"
                        ? websiteOrderUrl({ _id: order.appointmentId, fulfillment: order.fulfillment })
                        : `/dashboard/store-order?appointment=${order.appointmentId}`}
                        className="font-medium text-indigo-700 hover:text-indigo-900">
                        {typeof order.customer === "object" ? order.customer.lastName : "مشاهده سفارش"}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => setSelectedOrder(order)}
                        className="font-medium text-indigo-700 hover:text-indigo-900">
                        {typeof order.customer === "string" ? order.customer : order.customer?.lastName || "بدون نام"}
                      </button>
                    )}
                    <span className="mr-2 rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">{order.appointmentId ? "سایت" : "مغازه"}</span>
                  </td>

                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {statusOrder.map((status) => order.appointmentId && status === "تحویل به مشتری" ? (
                        <Link key={status} href={websiteOrderUrl({ _id: order.appointmentId, fulfillment: order.fulfillment })}
                          className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-800">
                          ادامه عملیات پیک
                        </Link>
                      ) : (
                        <button
                          key={status}
                          type="button"
                          disabled={Boolean(workingId)}
                          onClick={() =>
                            changeStatus(
                              order._id,
                              status as storeOrder["deliveryStatus"],
                            )
                          }
                          className={`rounded-lg border px-2 py-1 text-xs transition ${
                            order.deliveryStatus === status
                              ? statusColors[status]
                              : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td className="px-2 py-3 text-slate-900">
                    {order.deliveryCode || "---"}
                  </td>
                  <td className="px-2 py-3">{order.price?.toLocaleString("fa-IR") ?? "—"}</td>
                  <td className="rounded-l-xl px-2 py-3 text-xs text-slate-700">
                    {order.description?.length > 30
                      ? `${order.description.slice(0, 30)}...`
                      : order.description || "---"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <UserInfoModal
          closeModal={() => setSelectedOrder(null)}
          order={selectedOrder}
          setOrders={setOrders}
        />
      )}
    </>
  );
};

export default OrderTable;
