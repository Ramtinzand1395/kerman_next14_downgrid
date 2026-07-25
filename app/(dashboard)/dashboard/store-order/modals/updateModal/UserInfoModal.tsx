"use client";

import { useState } from "react";
import { Printer, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";

import { toPersianDate } from "@/helpers/toPersianDate";
import { sendPdfToBackend } from "@/helpers/sendPdfToBackend";
import { ConsoleType, storeOrder } from "@/types";

import UpdateStoreOrder from "./UpdateStoreOrder";

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
  ps5Copy: storeOrder[];
};

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

      toast.success(data.message || "سفارش حذف شد.");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("حذف سفارش انجام نشد.");
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

      toast.success(data.message || "سفارش بدون پیامک نهایی شد.");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("عملیات انجام نشد.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeModal}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <header className="flex flex-col gap-2 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            اطلاعات سفارش {customer?.lastName ? `(${customer.lastName})` : ""}
          </h2>
          <span className="text-sm text-slate-500">
            تاریخ ثبت: {toPersianDate(userOrder?.createdAt || "")}
          </span>
        </header>

        <div className="space-y-5 p-5">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-base font-bold text-slate-800">
              اطلاعات کاربر
            </h3>

            {customer ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">نام</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.name || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">نام خانوادگی</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.lastName || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">شماره موبایل</p>
                  <p className="mt-1 font-medium text-slate-800" dir="ltr">
                    {customer.mobile || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">جنسیت</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.sex || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">تاریخ تولد</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.birthday || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:col-span-2 lg:col-span-1">
                  <p className="text-xs text-slate-500">توضیحات مشتری</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.description || "---"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                اطلاعات کاربر برای این سفارش ثبت نشده است.
              </p>
            )}
          </section>
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
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-5">
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

          <button
            onClick={() => sendPdfToBackend(userOrder, customer)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            پرینت
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UserInfoModal;
