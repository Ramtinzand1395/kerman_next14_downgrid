"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { storeOrder } from "@/types";
import OrderSkeleton from "./modals/OrderSkeleton";
import UserInfoModal from "./modals/updateModal/UserInfoModal";

const statusOrder = ["دریافت از مشتری", "آماده", "تحویل به مشتری"] as const;

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
  ps5Copy: storeOrder[];
};

interface OrderTableProps {
  header: string;
  Orders: storeOrder[];
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
  consoleKey: "ps5" | "ps4" | "xbox" | "copy"|"ps5Copy";
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
}: OrderTableProps) => {
  const [selectedOrder, setSelectedOrder] = useState<storeOrder | null>(null);

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
      toast.warning("امکان بازگشت یا تکرار وضعیت وجود ندارد.");
      return;
    }

    const confirmChange = window.confirm(
      `آیا از تغییر وضعیت به «${newStatus}» مطمئن هستید؟`,
    );
    if (!confirmChange) return;

    setloadingSms(true);
    try {
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

      toast.success(data.message || "وضعیت سفارش با موفقیت تغییر کرد.");

      if (data.sms?.status === 200) {
        toast.success("پیامک نیز با موفقیت ارسال شد.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("خطا در تغییر وضعیت سفارش");
    } finally {
      setloadingSms(false);
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
                <th className="px-2 py-2 text-right">توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {Orders.map((order) => (
                <tr key={order._id} className="rounded-xl bg-slate-50">
                  <td className="rounded-r-xl px-2 py-3 text-slate-900">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="font-medium text-indigo-700 hover:text-indigo-900"
                    >
                      {typeof order.customer === "string"
                        ? order.customer
                        : order.customer?.lastName || "بدون نام"}
                    </button>
                  </td>

                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {statusOrder.map((status) => (
                        <button
                          key={status}
                          type="button"
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
