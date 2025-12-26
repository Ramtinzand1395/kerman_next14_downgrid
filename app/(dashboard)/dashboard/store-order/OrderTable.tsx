"use client";

import { storeOrder } from "@/types";
import { toast } from "react-toastify";
import UserInfoModal from "./modals/updateModal/UserInfoModal";
import { useState } from "react";
import OrderSkeleton from "./modals/OrderSkeleton";

const statusOrder = ["دریافت از مشتری", "آماده", "تحویل به مشتری"];
type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
};
interface OrderTableProps {
  header: string;
  Orders: storeOrder[];
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
  consoleKey: "ps5" | "ps4" | "xbox" | "copy";
  isLoading: boolean;
  setloadingSms:React.Dispatch<React.SetStateAction<boolean>>;
}

const OrderTable = ({
  header,
  Orders,
  setOrders,
  consoleKey,
  isLoading,
  setloadingSms,
}: OrderTableProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<storeOrder | null>(null);

  const changeStatus = async (
    orderId: string,
    newStatus: storeOrder["deliveryStatus"]
  ) => {
    const order = Orders.find((o) => o._id === orderId);
    if (!order) return;

    const currentIndex = statusOrder.indexOf(order.deliveryStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex <= currentIndex) {
      toast.warning("امکان بازگشت یا تکرار وضعیت وجود ندارد.");
      return;
    }

    const confirmChange = window.confirm(
      `آیا از تغییر وضعیت به "${newStatus}" مطمئن هستید؟`
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
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // 👇 آپدیت جدول داخل State
      setOrders((prev) => ({
        ...prev,
        [consoleKey]: prev[consoleKey].map((order) =>
          order._id === orderId
            ? { ...order, deliveryStatus: newStatus }
            : order
        ),
      }));

      toast.success(data.message);

      if (data.sms?.status === 200) {
        toast.success(`پیامک با موفقیت ارسال شد: ${data.sms.body}`);
      } else {
        toast.error(`خطا در ارسال پیام: ${data.sms?.body}`);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("خطا در تغییر وضعیت سفارش");
    } finally {
      setloadingSms(false);
    }
  };

  const handleOpenModal = (order: storeOrder) => {
    setSelectedOrder(order);
    setOpenModal(true);
  };
  const closeModal = () => {
    setOpenModal(false);
    setSelectedOrder(null);
  };

  return (
    <>
      <h2 className="md:text-xl text-sm font-semibold border-b border-gray-400 pb-5">
        {header}
      </h2>
      {isLoading ? (
        <OrderSkeleton rows={6} />
      ) : (
        <div className="overflow-x-auto ">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 mt-5 border-separate border-spacing-y-2">
            <thead className="text-gray-500  ">
              <tr>
                <th className="text-start text-sm px-2 py-2 whitespace-nowrap">
                  نام خانوادگی
                </th>
                <th className="text-center text-sm w-full px-2  py-2 whitespace-nowrap">
                  وضعیت
                </th>
                <th className="text-start text-sm px-2 py-2 whitespace-nowrap">
                  کد دریافت
                </th>
                <th className="text-center text-sm px-2 py-2 whitespace-nowrap">
                  توضیحات
                </th>
              </tr>
            </thead>
            <tbody>
              {Orders ? (
                Orders.map((order) => (
                  <tr className="" key={order._id}>
                    <td className="text-center text-black py-3 ">
                      <p
                        onClick={() => handleOpenModal(order)}
                        className="cursor-pointer hover:text-blue-500 transition duration-300"
                      >
                        {typeof order.customer === "string"
                          ? order?.customer
                          : order?.customer?.lastName}
                      </p>

                      {openModal && (
                        <UserInfoModal
                          closeModal={closeModal}
                          order={selectedOrder}
                          setOrders={setOrders}
                        />
                      )}
                    </td>
                    <td className="flex flex-row items-center justify-around py-3 gap-2 ">
                      {["دریافت از مشتری", "آماده", "تحویل به مشتری"].map(
                        (status) => (
                          <div
                            className="flex items-start space-x-2"
                            key={status}
                          >
                            <label className="group flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={order.deliveryStatus === status}
                                onChange={() =>
                                  changeStatus(
                                    order._id,
                                    status as storeOrder["deliveryStatus"]
                                  )
                                }
                                className="hidden peer"
                              />
                              <span
                                className={`relative w-6 h-6 flex justify-center items-center border-2 rounded-md shadow-md transition-all duration-500
                            ${
                              order.deliveryStatus === status
                                ? status === "دریافت از مشتری"
                                  ? "bg-orange-500 border-orange-500"
                                  : status === "آماده"
                                  ? "bg-blue-500 border-blue-500"
                                  : "bg-green-500 border-green-500"
                                : "bg-gray-100 border-gray-400"
                            }`}
                              >
                                {order.deliveryStatus === status && (
                                  <svg
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    className="w-5 h-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </span>
                              <span
                                className={`mx-1 text-xs font-medium whitespace-nowrap text-gray-700  transition-colors duration-300
                            ${
                              status === "دریافت از مشتری"
                                ? "group-hover:text-orange-500"
                                : status === "آماده"
                                ? "group-hover:text-blue-500"
                                : "group-hover:text-green-500"
                            }`}
                              >
                                {status}
                              </span>
                            </label>
                          </div>
                        )
                      )}
                    </td>
                    <td className="text-center text-black py-3 ">
                      {order.deliveryCode}
                    </td>
                    <td className="text-start text-black py-3 text-xs">
                      {order.description.length > 10
                        ? `${order.description.slice(0, 20)}...`
                        : order.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-5 text-gray-400">
                    سفارشی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
export default OrderTable;
