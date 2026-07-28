"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "react-toastify";

import { storeOrder } from "@/types";
import { orderSchema } from "@/validations/CustomerAppValidation";
import GameDropdown from "../addorder/GameDropdown";

interface UpdateStoreOrderProps {
  closeModal?: () => void;
  userOrder: storeOrder | null;
  setUserOrder: React.Dispatch<React.SetStateAction<storeOrder | null>>;
  onOrderUpdated?: (updatedOrder: storeOrder) => void;
}

const UpdateStoreOrder = ({
  userOrder,
  setUserOrder,
  onOrderUpdated,
}: UpdateStoreOrderProps) => {
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  /* ================= change handler ================= */
  const handleOrderChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof storeOrder,
  ) => {
    const value = field === "price" ? Number(e.target.value) : e.target.value;

    setUserOrder((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  /* ================= save ================= */
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

      setUserOrder(updatedOrder);
      onOrderUpdated?.(updatedOrder);

      toast.success(data.message || "سفارش ویرایش شد");
      setIsEditingOrder(false);
    } catch (err) {
      console.error(err);
      toast.error("خطا در ویرایش سفارش");
    }
  };

  /* ================= UI ================= */
  return (
    <section className="space-y-4 rounded-xl border p-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold">جزئیات سفارش</h3>

        <button
          onClick={() => setIsEditingOrder((p) => !p)}
          className="flex items-center gap-1 rounded-lg border px-3 py-1 text-xs"
        >
          <Pencil className="h-3 w-3" />
          {isEditingOrder ? "لغو" : "ویرایش"}
        </button>
      </div>

      {/* form */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* console */}
        <div>
          <label className="text-sm">دستگاه</label>

          {isEditingOrder ? (
            <select
              title="consoleType"
              value={userOrder?.consoleType || ""}
              onChange={(e) => handleOrderChange(e, "consoleType")}
              className="w-full rounded-lg border p-2"
            >
              <option value="">انتخاب کنید</option>
               <option value="">انتخاب کنید</option>
              <option value="ps5">PS5</option>
              <option value="ps5Copy"> ps5-copy</option>
              <option value="ps4">PS4</option>
              <option value="copy"> ps4-copy</option>
              <option value="xbox">Xbox</option>
            </select>
          ) : (
            <p>{userOrder?.consoleType || "---"}</p>
          )}
        </div>

        {/* price */}
        <div>
          <label className="text-sm">قیمت</label>

          {isEditingOrder ? (
            <input
              title="price"
              type="number"
              value={userOrder?.price || 0}
              onChange={(e) => handleOrderChange(e, "price")}
              className="w-full rounded-lg border p-2"
            />
          ) : (
            <p>{userOrder?.price?.toLocaleString("fa-IR") || 0} تومان</p>
          )}
        </div>

        {/* description */}
        <div>
          <label className="text-sm">توضیحات</label>

          <textarea
            title="caption"
            value={userOrder?.description || ""}
            readOnly={!isEditingOrder}
            onChange={(e) => handleOrderChange(e, "description")}
            className="w-full rounded-lg border p-2"
          />
        </div>
      </div>

      {/* games */}
      <div>
        <label className="text-sm">لیست بازی‌ها</label>

        {isEditingOrder && (
          <GameDropdown
            Selectedgames={userOrder}
            setSelectedgames={setUserOrder}
          />
        )}

        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {userOrder?.list?.length ? (
            userOrder.list.map((game) => (
              <div
                key={game._id}
                className="flex items-center justify-between rounded-lg border p-2 text-sm"
              >
                {/* FIX HERE */}
                <span>{game.name}</span>

                {isEditingOrder && (
                  <button
                    title="close"
                    onClick={() =>
                      setUserOrder((prev) =>
                        prev
                          ? {
                              ...prev,
                              list: prev.list.filter((g) => g._id !== game._id),
                            }
                          : prev,
                      )
                    }
                    className="text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">لیست خالی است</p>
          )}
        </div>
      </div>

      {/* save */}
      {isEditingOrder && userOrder?._id && (
        <button
          onClick={() => handleSaveOrder(userOrder._id)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          <Save className="h-4 w-4" />
          ذخیره
        </button>
      )}
    </section>
  );
};

export default UpdateStoreOrder;
