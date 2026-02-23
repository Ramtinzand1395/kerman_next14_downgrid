"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "react-toastify";

import { storeOrder } from "@/types";
import { orderSchema } from "@/validations/CustomerAppValidation";
import GameDropdown from "../addorder/GameDropdown";

interface UpdateStoreOrderProps {
  closeModal: () => void;
  userOrder?: storeOrder | null;
  setUserOrder: React.Dispatch<React.SetStateAction<storeOrder | null>>;
  onOrderUpdated?: (updatedOrder: storeOrder) => void;
}

const UpdateStoreOrder = ({
  userOrder,
  setUserOrder,
  onOrderUpdated,
}: UpdateStoreOrderProps) => {
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  const handleOrderChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof storeOrder,
  ) => {
    const value = field === "price" ? Number(e.target.value) : e.target.value;
    setUserOrder((prev) => (prev ? { ...prev, [field]: value } : prev));
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
      const updatedOrder = (data?.data as storeOrder) || userOrder;
      if (updatedOrder) {
        setUserOrder(updatedOrder);
        onOrderUpdated?.(updatedOrder);
      }

      toast.success(data.message || "سفارش با موفقیت ویرایش شد.");
      setIsEditingOrder(false);
    } catch (err) {
      console.error(err);
      toast.error("خطا در ویرایش سفارش");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">جزئیات سفارش</h3>
        <button
          onClick={() => setIsEditingOrder((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" />
          {isEditingOrder ? "لغو ویرایش" : "ویرایش"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm text-slate-600">
          <span>دستگاه</span>
          {isEditingOrder ? (
            <select
              title="ویرایش دستگاه"
              value={userOrder?.consoleType || ""}
              onChange={(e) => handleOrderChange(e, "consoleType")}
              className="h-10 w-full rounded-lg border border-slate-300 px-2"
            >
              <option value="">انتخاب کنید</option>
              <option value="ps4">PS4</option>
              <option value="ps5">PS5</option>
              <option value="copy">کپی خور</option>
              <option value="xbox">Xbox</option>
            </select>
          ) : (
            <p>{userOrder?.consoleType || "---"}</p>
          )}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>قیمت</span>
          {isEditingOrder ? (
            <input
              title="ویرایش قیمت"
              type="number"
              value={userOrder?.price || 0}
              onChange={(e) => handleOrderChange(e, "price")}
              className="h-10 w-full rounded-lg border border-slate-300 px-2"
            />
          ) : (
            <p>{userOrder?.price?.toLocaleString("fa-IR") || "۰"} تومان</p>
          )}
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>توضیحات</span>
          <textarea
            title="ویرایش توضیحات"
            className="min-h-24 w-full rounded-lg border border-slate-300 p-2"
            readOnly={!isEditingOrder}
            value={userOrder?.description || ""}
            onChange={(e) => handleOrderChange(e, "description")}
          />
        </label>
      </div>

      {userOrder && (
        <div className="space-y-2">
          <label className="text-sm text-slate-600">لیست بازی‌ها</label>

          {isEditingOrder && (
            <GameDropdown
              Selectedgames={userOrder}
              setSelectedgames={setUserOrder}
            />
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {userOrder?.list?.length ? (
              userOrder.list.map((game, index) => (
                <div
                  key={`${game}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <span>{game}</span>

                  {isEditingOrder && (
                    <button
                      onClick={() =>
                        setUserOrder((prev) =>
                          prev
                            ? {
                                ...prev,
                                list: prev.list.filter((_, i) => i !== index),
                              }
                            : prev,
                        )
                      }
                      className="text-rose-500"
                      title="حذف بازی"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <span className="text-sm text-slate-400">
                لیست بازی‌ها خالی است.
              </span>
            )}
          </div>
        </div>
      )}

      {isEditingOrder && userOrder?._id && (
        <button
          onClick={() => handleSaveOrder(userOrder._id)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" />
          ذخیره تغییرات سفارش
        </button>
      )}
    </section>
  );
};

export default UpdateStoreOrder;
