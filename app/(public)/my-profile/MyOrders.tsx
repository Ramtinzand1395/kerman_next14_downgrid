"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface Product {
  title: string;
  mainImage: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  total: number;
  product: Product;
}

interface Address {
  province: string;
  city: string;
  address: string;
}

interface Order {
  id: number;
  items: OrderItem[];
  totalPrice: number;
  finalPrice: number;
  status: string;
  createdAt: string;
  address?: Address;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار پرداخت",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

function toPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function toPersianDate(date: string) {
  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/orders")
      .then((res) => {
        if (!res.ok) throw new Error("خطا در دریافت سفارش‌ها");
        return res.json();
      })
      .then((data: Order[]) => setOrders(data))
      .catch(() => setError("دریافت لیست سفارش‌ها با مشکل مواجه شد."))
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
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 h-5 w-36 rounded bg-slate-200" />
            <div className="mb-2 h-4 w-56 rounded bg-slate-100" />
            <div className="mb-5 h-4 w-40 rounded bg-slate-100" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-slate-100 p-2"
                >
                  <div className="mx-auto h-14 w-14 rounded bg-slate-200" />
                  <div className="h-3 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
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

  if (!sortedOrders.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">
          هنوز سفارشی ثبت نکرده‌اید
        </p>
        <p className="mt-2 text-sm text-slate-500">
          بعد از اولین خرید، وضعیت و جزئیات سفارش‌ها در این بخش نمایش داده
          می‌شود.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {sortedOrders.map((order) => {
        const totalItems = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        const badgeClass =
          statusStyles[order.status] ||
          "bg-slate-100 text-slate-700 border-slate-200";
        const statusLabel = statusLabels[order.status] || order.status;

        return (
          <article
            key={order.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">شماره سفارش</p>
                <p className="text-base font-bold text-slate-900">
                  #{order.id}
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
              {order.address && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold">آدرس تحویل:</span>{" "}
                  {order.address.province}، {order.address.city}،{" "}
                  {order.address.address}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image
                        fill
                        src={item.product.mainImage}
                        alt={item.product.title}
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.product.title}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>تعداد: {item.quantity}</span>
                        <span>{toPrice(item.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3">
                <p className="text-slate-600">
                  تعداد کالاها:{" "}
                  <span className="font-semibold text-slate-900">
                    {totalItems}
                  </span>
                </p>
                <p className="text-slate-600">
                  جمع کل:{" "}
                  <span className="font-semibold text-slate-900">
                    {toPrice(order.totalPrice)}
                  </span>
                </p>
                <p className="text-slate-600">
                  مبلغ نهایی:{" "}
                  <span className="font-bold text-emerald-700">
                    {toPrice(order.finalPrice)}
                  </span>
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
