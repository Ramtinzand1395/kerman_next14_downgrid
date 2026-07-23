"use client";

import { useEffect, useMemo, useState } from "react";

type OrderStatus = "pending" | "confirmed" | "rejected" | "completed";

interface Product {
  name: string;
  platform?: string;
  price?: number;
  size?: number;
}

interface AddressRef {
  province?: string;
  city?: string;
  address?: string;
  plaque?: string | number;
  unit?: string | number;
  postalCode?: string;
}

interface GameOrder {
  _id: string;
  customerName: string;
  phone: string;
  address?: string;
  addressRef?: AddressRef | null;
  message?: string;
  products: Product[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
}

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "در انتظار بررسی",
  confirmed: "تایید شده",
  rejected: "رد شده",
  completed: "تکمیل شده",
};

function toPrice(value: number) {
  return `${(value || 0).toLocaleString("fa-IR")} تومان`;
}

function toPersianDate(date: string) {
  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAddress(order: GameOrder) {
  if (order.addressRef) {
    const a = order.addressRef;
    return [a.province && a.city ? `${a.province} - ${a.city}` : a.province || a.city, a.address]
      .filter(Boolean)
      .join("، ");
  }
  return order.address || "";
}

export default function MyGameOrders() {
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/customer-game-orders")
      .then((res) => {
        if (!res.ok) throw new Error("خطا در دریافت سفارش‌ها");
        return res.json();
      })
      .then((data: GameOrder[]) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError("دریافت لیست سفارش‌های بازی با مشکل مواجه شد."))
      .finally(() => setLoading(false));
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 h-5 w-40 rounded bg-slate-200" />
            <div className="mb-2 h-4 w-56 rounded bg-slate-100" />
            <div className="mb-5 h-4 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">
          سفارش‌های نصب بازی
        </h2>
        <span className="text-xs text-slate-500">
          {sortedOrders.length} سفارش
        </span>
      </div>

      {!sortedOrders.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">
            هنوز سفارش بازی ثبت نکرده‌اید
          </p>
          <p className="mt-2 text-sm text-slate-500">
            از بخش «ثبت نوبت نصب بازی» می‌توانید اولین سفارش خود را ثبت کنید.
          </p>
        </div>
      ) : (
        sortedOrders.map((order) => {
          const badgeClass =
            statusStyles[order.status] ||
            "bg-slate-100 text-slate-700 border-slate-200";
          const statusLabel = statusLabels[order.status] || order.status;
          const addressText = formatAddress(order);

          return (
            <article
              key={order._id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">شماره سفارش</p>
                  <p className="text-base font-bold text-slate-900">
                    #{String(order._id).slice(-6).toUpperCase()}
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <p className="text-sm text-slate-500">تاریخ ثبت</p>
                  <p className="text-sm font-medium text-slate-700">
                    {toPersianDate(order.createdAt)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="space-y-4 p-4">
                {addressText && (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-semibold">آدرس نصب:</span>{" "}
                    {addressText}
                  </div>
                )}

                {order.message && (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-semibold">پیام:</span> {order.message}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {order.products.map((product, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {product.name}
                      </p>
                      <div className="mt-1 space-y-1 text-xs text-slate-500">
                        {product.platform && (
                          <p>پلتفرم: {product.platform}</p>
                        )}
                        {product.size ? <p>حجم: {product.size} GB</p> : null}
                        {product.price !== undefined && product.price > 0 && (
                          <p>{toPrice(product.price)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  <p className="text-slate-600">
                    تعداد بازی‌ها:{" "}
                    <span className="font-semibold text-slate-900">
                      {order.products.length}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    جمع کل:{" "}
                    <span className="font-bold text-emerald-700">
                      {toPrice(order.totalPrice)}
                    </span>
                  </p>
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
