"use client";
import { toPersianDate } from "@/helpers/toPersianDate";
import { Customer, storeOrder } from "@/types";
import { X } from "lucide-react";
import { useState } from "react";
import UpdateUser from "./UpdateUser";
import UpdateStoreOrder from "./UpdateStoreOrder";
import { sendPdfToBackend } from "@/helpers/sendPdfToBackend";
import { toast } from "react-toastify";

type consoleType = "ps5" | "ps4" | "xbox" | "copy";
type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
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

  const [customer, setCustomer] = useState<Customer | null>(
    order?.customer && typeof order.customer !== "string"
      ? order.customer
      : null,
  );

  const HandleDeleteOrder = async () => {
    if (!userOrder) return;

    const confirmDelete = window.confirm("آیا از حذف سفارش مطمئنی؟");
    if (!confirmDelete) return;
    try {
      // const { data, status } = await deleteOrder(orderId);
      const res = await fetch(`/api/admin/store-order/${userOrder._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === 200) {
        toast.success(data.message);
        const consoleType = userOrder.consoleType as consoleType;

        setOrders((prev) => ({
          ...prev,
          [consoleType]: prev[consoleType].filter(
            (order) => order._id !== userOrder._id,
          ),
        }));
      }
      closeModal();
    } catch (err) {
      console.log(err);
    }
  };

  const HandleNoSms = async () => {
    if (!customer?._id || !userOrder) return;
    const confirmNoSms = window.confirm(
      "آیا از انجام عملیات بدون پیام مطمئنی؟",
    );

    if (!confirmNoSms) return;
    try {
      const res = await fetch(
        `/api/admin/store-order/changestatus/${userOrder._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "تحویل به مشتری",
            sendSms: false, // 👈 پیامک ارسال نشه
          }),
        },
      );
      const data = await res.json();
      if (res.status === 200) {
        toast.success(data.message);
        const consoleType = userOrder.consoleType as consoleType;

        setOrders((prev) => ({
          ...prev,
          [consoleType]: prev[consoleType].filter(
            (order) => order._id !== userOrder._id,
          ),
        }));
        closeModal();
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-400/50 backdrop-blur-sm"
        onClick={() => closeModal()}
      ></div>

      {/* Modal content */}
      <div className="relative z-50 w-[90vw]  bg-white rounded-2xl  shadow-xl animate-fadeIn h-[80vh] overflow-y-auto">
        {/* Close Button */}
        <button
          title="btn"
          onClick={() => closeModal()}
          className="absolute top-4 right-4 text-gray-500 hover:text-black transition"
        >
          <X color="red" size={18} />
        </button>
        {/* ==============body=============== */}
        {/* Header */}
        <div className="flex items-center justify-around text-black border-b-2 p-4 rounded-t-2xl">
          <h2 className="text-xs md:text-xl font-bold">
            اطلاعات سفارش {customer?.lastName || "نام کاربر"}
          </h2>
          <div>
            <p className="mt-1">{toPersianDate(userOrder?.createdAt || "")}</p>
          </div>
        </div>
        <div className="p-6">
          <UpdateUser
            customer={customer}
            setCustomer={setCustomer}
            closeModal={closeModal}
          />
          {/* Order Info */}
          <UpdateStoreOrder
            userOrder={userOrder}
            setUserOrder={setUserOrder}
            closeModal={closeModal}
          />
        </div>
        <div className="flex items-center justify-around">
          <button
            onClick={HandleDeleteOrder}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          >
            حذف سفارش
          </button>
          <button
            onClick={HandleNoSms}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition"
          >
            ذخیره بدون پیام
          </button>
          <button
            onClick={() => sendPdfToBackend(userOrder, customer)}
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition"
          >
            پرینت
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;
