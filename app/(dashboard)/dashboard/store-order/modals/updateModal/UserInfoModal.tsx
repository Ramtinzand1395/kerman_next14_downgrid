"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import OrderInfoDialog from "./OrderInfoDialog";
import PrintOrderButton from "./PrintOrderButton";
import { ConsoleType, storeOrder, OrdersByConsole } from "@/types";

import UpdateStoreOrder from "./UpdateStoreOrder";

interface UserInfoModalProps {
  closeModal: () => void;
  order?: storeOrder | null;
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
}

const UserInfoModal = ({
  closeModal,
  order,
  setOrders,
}: UserInfoModalProps) => {
  const [userOrder, setUserOrder] = useState<storeOrder | null>(order || null);

  const customer =
    userOrder?.customer && typeof userOrder.customer !== "string"
      ? userOrder.customer
      : null;

  const handleDeleteOrder = async () => {
    if (!userOrder) return;
    if (!window.confirm("آیا از حذف سفارش مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/admin/store-order/${userOrder._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "خطا در حذف سفارش");

      const consoleType = userOrder.consoleType as ConsoleType;
      setOrders((prev) => ({
        ...prev,
        [consoleType]: prev[consoleType].filter(
          (item) => item._id !== userOrder._id,
        ),
      }));

      toast.success(data.message || "سفارش حذف شد و از فهرست کنار رفت.");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("سفارش حذف نشد؛ دوباره تلاش کنید.");
    }
  };

  const handleCompleteWithoutSms = async () => {
    if (!userOrder?._id) return;
    if (!window.confirm("ثبت تحویل بدون ارسال پیامک انجام شود؟")) return;

    try {
      const res = await fetch(
        `/api/admin/store-order/changestatus/${userOrder._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "تحویل به مشتری",
            sendSms: false,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "خطا در ثبت وضعیت");

      const consoleType = userOrder.consoleType as ConsoleType;
      setOrders((prev) => ({
        ...prev,
        [consoleType]: prev[consoleType].filter(
          (item) => item._id !== userOrder._id,
        ),
      }));

      toast.success(data.message || "سفارش نهایی شد؛ پیامکی برای مشتری ارسال نشد.");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("سفارش نهایی نشد؛ دوباره تلاش کنید.");
    }
  };

  return (
    <OrderInfoDialog
      closeModal={closeModal}
      customer={customer}
      createdAt={userOrder?.createdAt}
      actions={
        <>
          <button
            onClick={handleDeleteOrder}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            حذف سفارش
          </button>

          <button
            onClick={handleCompleteWithoutSms}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            ثبت بدون پیامک
          </button>

          <PrintOrderButton order={userOrder} customer={customer} />
        </>
      }
    >
      <UpdateStoreOrder
        userOrder={userOrder}
        setUserOrder={setUserOrder}
        closeModal={closeModal}
        onOrderUpdated={(updatedOrder) => {
          const newConsoleType = updatedOrder.consoleType as ConsoleType;
          const previousConsoleType = userOrder?.consoleType as
            | ConsoleType
            | undefined;

          setOrders((prev) => {
            if (
              !previousConsoleType ||
              previousConsoleType === newConsoleType
            ) {
              return {
                ...prev,
                [newConsoleType]: prev[newConsoleType].map((item) =>
                  item._id === updatedOrder._id ? updatedOrder : item,
                ),
              };
            }

            return {
              ...prev,
              [previousConsoleType]: prev[previousConsoleType].filter(
                (item) => item._id !== updatedOrder._id,
              ),
              [newConsoleType]: [updatedOrder, ...prev[newConsoleType]],
            };
          });
        }}
      />
    </OrderInfoDialog>
  );
};

export default UserInfoModal;
