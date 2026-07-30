"use client";

import { toPersianDate } from "@/helpers/toPersianDate";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

type OrderStatus = "pending" | "confirmed" | "rejected" | "completed";

interface Product {
  name: string;
  platform?: string;
  price?: number;
  size?: number;
}

interface OrderUser {
  _id: string;
  username: string;
  mobile: string;
  createdAt?: string;
}

interface CustomerGameOrder {
  _id: string;
  customerName: string;
  phone: string;
  address?: string;
  message?: string;
  user?: OrderUser;
  products: Product[];
  totalPrice: number;
  status: OrderStatus;
  createdAt?: string;
}

interface Target {
  kind: "CustomerGameOrder";
  item: CustomerGameOrder;
}

interface OrderNotification {
  _id: string;
  target: Target;
}

interface CustomerGameOrderModalProps {
  selected: OrderNotification;
  closeModal: () => void;
}

const statusMap: Record<OrderStatus, { title: string; color: string }> = {
  pending: {
    title: "در انتظار بررسی",
    color: "bg-yellow-100 text-yellow-700",
  },
  confirmed: {
    title: "تایید شده",
    color: "bg-blue-100 text-blue-700",
  },
  rejected: {
    title: "رد شده",
    color: "bg-red-100 text-red-700",
  },
  completed: {
    title: "تکمیل شده",
    color: "bg-green-100 text-green-700",
  },
};

const statusOptions: OrderStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "completed",
];

const CustomerGameOrderModal = ({
  selected,
  closeModal,
}: CustomerGameOrderModalProps) => {
  const order = selected.target.item;

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === status || updating) return;

    const previousStatus = status;
    setStatus(newStatus);
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/customer-game-orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "خطا در بروزرسانی وضعیت");
      }

      toast.success("وضعیت سفارش با موفقیت بروزرسانی شد.");
    } catch (error) {
      setStatus(previousStatus);
      toast.error(
        error instanceof Error ? error.message : "خطا در بروزرسانی وضعیت",
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <h2 className="mb-6 text-xl font-bold">اطلاعات سفارش مشتری</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-bold">نام مشتری:</span>
            <p>{order.user?.username || order.customerName}</p>
          </div>

          <div>
            <span className="font-bold">شماره تماس:</span>
            <p>{order.user?.mobile || order.phone}</p>
          </div>

          <div className="col-span-2">
            <span className="font-bold">آدرس:</span>
            <p className="mt-1 leading-7">{order.address || "ثبت نشده"}</p>
          </div>

          {order.user?._id && (
            <div>
              <span className="font-bold">شناسه کاربر:</span>
              <p dir="ltr" className="text-right font-mono text-xs">
                {order.user._id}
              </p>
            </div>
          )}

          {order.message && (
            <div className="col-span-2">
              <span className="font-bold">پیام مشتری:</span>
              <p className="mt-1 rounded-lg bg-gray-50 p-3 leading-7">
                {order.message}
              </p>
            </div>
          )}

          <div>
            <span className="font-bold">تاریخ ثبت:</span>
            <p>{order.createdAt ? toPersianDate(order.createdAt) : "نامشخص"}</p>
          </div>

          <div>
            <span className="font-bold">وضعیت سفارش:</span>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusMap[status].color
                }`}
              >
                {statusMap[status].title}
              </span>
              {updating && (
                <Loader2 size={14} className="animate-spin text-gray-400" />
              )}
            </div>
            <select
              value={status}
              onChange={(e) =>
                handleStatusChange(e.target.value as OrderStatus)
              }
              disabled={updating}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusMap[option].title}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <span className="font-bold">مبلغ کل:</span>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              {order.totalPrice.toLocaleString()} تومان
            </p>
          </div>

          <div className="col-span-2">
            <h3 className="mb-3 font-bold">محصولات سفارش</h3>

            <div className="space-y-3">
              {order.products.map((product, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <p>
                    <span className="font-semibold">نام:</span> {product.name}
                  </p>

                  {product.platform && (
                    <p>
                      <span className="font-semibold">پلتفرم:</span>{" "}
                      {product.platform}
                    </p>
                  )}

                  {product.size && (
                    <p>
                      <span className="font-semibold">حجم:</span> {product.size}{" "}
                      GB
                    </p>
                  )}

                  {product.price !== undefined && (
                    <p>
                      <span className="font-semibold">قیمت:</span>{" "}
                      {product.price.toLocaleString()} تومان
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerGameOrderModal;
