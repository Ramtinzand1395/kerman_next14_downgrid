"use client";

import { useState } from "react";
import {
  ArrowRight,
  Gamepad2,
  Monitor,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { ConsoleType, Customer, GameItem, storeOrder } from "@/types";
import GameDropdown from "./GameDropdown";

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
  ps5Copy: storeOrder[];
};

interface AddCustomerOrderProps {
  customerData: Customer;
  closeModal: () => void;
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
  onBack: () => void;
}

const calcTotals = (list: GameItem[]) => {
  const totalSize = list.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalPrice = list.reduce((sum, item) => sum + (item.price || 0), 0);

  return {
    totalSize,
    totalPrice,
  };
};

const AddCustomerOrder = ({
  customerData,
  closeModal,
  setOrders,
  onBack,
}: AddCustomerOrderProps) => {
  const [loading, setLoading] = useState(false);

  const [order, setOrder] = useState<storeOrder | null>({
    _id: "",
    list: [],
    price: null,
    totalSize: 0,
    totalPrice: 0,
    customerId: customerData._id,
    description: "",
    consoleType: "",
    deliveryStatus: "",
    createdAt: "",
    updatedAt: "",
    deliveryCode: "",
    deliveryDate: "",
  });

  const handleSubmit = async () => {
    if (!customerData._id) {
      toast.error("ابتدا اطلاعات مشتری را ثبت کنید.");
      return;
    }

    if (!order?.consoleType || !order.price || order.list.length === 0) {
      toast.warning("نوع دستگاه، قیمت و لیست بازی الزامی است.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/store-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, customerId: customerData._id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "ثبت سفارش ناموفق بود");

      const consoleType = data.order.consoleType as ConsoleType;

      setOrders((prev) => ({
        ...prev,
        [consoleType]: [data.order, ...(prev[consoleType] || [])],
      }));

      toast.success(data.message || "سفارش با موفقیت ثبت شد.");

      if (data?.sms?.body) toast.info(data.sms.body);

      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("در ثبت سفارش خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "price") {
      const numericValue = value.replace(/,/g, "");

      if (!/^\d*$/.test(numericValue)) return;

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              price: numericValue === "" ? null : Number(numericValue),
            }
          : prev,
      );

      return;
    }

    setOrder((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleRemoveGame = (game: GameItem) => {
    setOrder((prev) => {
      if (!prev) return prev;

      const newList = prev.list.filter(
        (item) => (item._id ?? item.name) !== (game._id ?? game.name),
      );

      const { totalSize, totalPrice } = calcTotals(newList);

      return {
        ...prev,
        list: newList,
        totalSize,
        totalPrice,
        price: totalPrice === 0 ? null : totalPrice,
      };
    });
  };

  const formatNumber = (value: number | null | undefined) =>
    value ? value.toLocaleString("en-US") : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm text-slate-600">
          <span>قیمت نهایی سفارش (تومان)</span>

          <div className="relative">
            <input
              type="text"
              name="price"
              value={formatNumber(order?.price)}
              onChange={handleOrderChange}
              className="h-10 w-full rounded-xl border border-slate-300 pr-9 pl-3 outline-none ring-indigo-100 focus:ring-4"
            />

            <ReceiptText className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>نوع دستگاه</span>

          <div className="relative">
            <select
              title="نوع دستگاه"
              name="consoleType"
              value={order?.consoleType || ""}
              onChange={handleOrderChange}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 outline-none ring-indigo-100 focus:ring-4"
            >
              <option value="">انتخاب کنید</option>
              <option value="ps5">PS5</option>
              <option value="ps5Copy"> ps5-copy</option>
              <option value="ps4">PS4</option>
              <option value="copy"> ps4-copy</option>
              <option value="xbox">Xbox</option>
            </select>

            <Monitor className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <div className="space-y-1 text-sm text-slate-600">
          <span>افزودن بازی</span>
          <GameDropdown Selectedgames={order} setSelectedgames={setOrder} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700">
          <Gamepad2 className="h-4 w-4" />
          بازی‌های انتخاب‌شده
        </h3>

        {order?.list.length === 0 ? (
          <p className="text-xs text-slate-500">
            هنوز بازی‌ای انتخاب نشده است.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {order?.list.map((game) => (
              <li
                key={game._id ?? game.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">
                    {game.name}
                  </p>

                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{(game.size || 0).toLocaleString("en-US")} GB</span>
                    <span>
                      {(game.price || 0).toLocaleString("en-US")} تومان
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  title="حذف بازی"
                  onClick={() => handleRemoveGame(game)}
                  className="shrink-0 text-rose-500 transition hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">تعداد بازی</p>
            <p className="text-sm font-semibold text-slate-700">
              {(order?.list.length ?? 0).toLocaleString("en-US")}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">مجموع حجم</p>
            <p className="text-sm font-semibold text-slate-700">
              {(order?.totalSize ?? 0).toLocaleString("en-US")} GB
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">مجموع قیمت بازی‌ها</p>
            <p className="text-sm font-semibold text-slate-700">
              {(order?.totalPrice ?? 0).toLocaleString("en-US")} تومان
            </p>
          </div>
        </div>
      </div>

      <label className="block space-y-1 text-sm text-slate-600">
        <span>توضیحات</span>

        <textarea
          name="description"
          value={order?.description || ""}
          onChange={handleOrderChange}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-indigo-100 focus:ring-4"
        />
      </label>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          <ArrowRight className="h-4 w-4" />
          مرحله قبل
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "در حال ثبت..." : "ثبت سفارش"}
        </button>
      </div>
    </div>
  );
};

export default AddCustomerOrder;
