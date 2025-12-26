"use client";

import { storeOrder } from "@/types";
import { X } from "lucide-react";
import { useState } from "react";
import GameDropdown from "../addorder/GameDropdown";
import { orderSchema } from "@/validations/CustomerAppValidation";
import { toast } from "react-toastify";

interface UpdateStoreOrderProps {
  closeModal: () => void;
  userOrder?: storeOrder | null;
  setUserOrder: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}
const UpdateStoreOrder = ({
  userOrder,
  setUserOrder,
  closeModal,
}: UpdateStoreOrderProps) => {
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const handleOrderChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof storeOrder // changed from keyof Customer to keyof customerOrder
  ) => {
    setUserOrder((prev) =>
      prev ? { ...prev, [field]: e.target.value } : prev
    );
  };
  const handleSaveOrder = async (orderId: string) => {
    try {
      await orderSchema.validate(userOrder, { abortEarly: false });

      const res = await fetch(`/api/admin/store-order/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userOrder),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setIsEditingOrder(false);
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("خطا در ویرایش کاربر");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-600">
            دستگاه
          </label>
          {isEditingOrder ? (
            <select
              title="edit"
              value={userOrder?.consoleType || ""}
              onChange={(e) => handleOrderChange(e, "consoleType")}
              className="border p-1 rounded-md w-full"
            >
              <option value="">انتخاب کنید</option>
              <option value="ps4">PS4</option>
              <option value="ps5">PS5</option>
              <option value="copy">کپی خور</option>
              <option value="xbox">xbox</option>
            </select>
          ) : (
            <p className="mt-1">{userOrder?.consoleType || "نامشخص"}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">
            قیمت
          </label>
          {isEditingOrder ? (
            <input
              title="edit"
              type="number"
              value={userOrder?.price || 0}
              onChange={(e) => handleOrderChange(e, "price")}
              className="border p-1 rounded-md w-full"
            />
          ) : (
            <p className="mt-1">
              {userOrder?.price?.toLocaleString() || "۰"} تومان
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">
            توضیحات
          </label>
          <textarea
            title="edit"
            className="w-full border rounded-md p-2 text-sm text-gray-700"
            rows={3}
            readOnly={!isEditingOrder}
            value={userOrder?.description}
            onChange={(e) => handleOrderChange(e, "description")}
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600">
          لیست بازی‌ها
        </label>
        {userOrder && (
          <GameDropdown
            Selectedgames={userOrder}
            setSelectedgames={setUserOrder}
          />
        )}
        <div className="mt-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {userOrder?.list?.length ? (
            userOrder?.list.map((game, index) => (
              <div
                className="flex items-center border-2 p-2 rounded-2xl text-black shadow-md my-3"
                key={index}
              >
                <button
                  onClick={() => {
                    setUserOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            list: prev.list.filter((_, i) => i !== index),
                          }
                        : prev
                    );
                  }}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="حذف بازی"
                >
                  <X size={20} />
                </button>
                <span key={index} className="block ">
                  {game}
                </span>
              </div>
            ))
          ) : (
            <span className="text-gray-400">لیست بازی‌ها خالی است</span>
          )}
        </div>
      </div>
      <div className="flex items-start gap-4">
        <button
          onClick={() => {
            setIsEditingOrder(!isEditingOrder);
            if (isEditingOrder) {
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
        >
          {isEditingOrder ? "لغو ویرایش" : "ویرایش اطلاعات سفارش"}
        </button>
        {isEditingOrder && userOrder?._id && (
          <button
            onClick={() => handleSaveOrder(userOrder?._id)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
          >
            ذخیره
          </button>
        )}
      </div>
    </div>
  );
};

export default UpdateStoreOrder;
