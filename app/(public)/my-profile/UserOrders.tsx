"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  title: string;
  price: number;
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
  receiverPhone: string;
}

interface Order {
  id: number;
  totalPrice: number;
  shippingCost: number;
  finalPrice: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  description: string | null;
  createdAt: string;
  items: OrderItem[];
  address: Address | null;
}

import { Session } from "next-auth";

interface SidebarProps {
  session: Session | null;
}

export default function UserOrders({ session }: SidebarProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/orders/user-order`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در دریافت سفارش‌ها");
      const data: Order[] = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [session]);

  if (!session)
    return <p className="text-center text-gray-500 mt-10">لطفا وارد شوید</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {orders.length === 0 && (
        <p className="text-center text-gray-600 text-lg">
          شما هنوز سفارشی ثبت نکرده‌اید.
        </p>
      )}
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-6"
        >
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">سفارش #{order.id}</span>
              <span className="text-gray-400 text-sm">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:gap-6 text-gray-700">
              <div>
                <span className="font-semibold">وضعیت:</span> {order.status}
              </div>
              <div>
                <span className="font-semibold">روش پرداخت:</span>{" "}
                {order.paymentMethod}
              </div>
            </div>

            <div className="text-gray-700">
              <span className="font-semibold">آدرس:</span>{" "}
              {order.address
                ? `${order.address.city} - ${order.address.address}`
                : "ندارد"}
            </div>

            <div>
              <span className="font-semibold text-gray-800">آیتم‌ها:</span>
              <ul className="mt-1 ml-4 list-disc space-y-1 text-gray-700">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.product.title} × {item.quantity}
                    </span>
                    <span>{item.total.toLocaleString()} تومان</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="md:w-48 flex flex-col gap-2 text-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">قیمت کل:</span>
              <span>{order.totalPrice.toLocaleString()} تومان</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">هزینه ارسال:</span>
              <span>{order.shippingCost.toLocaleString()} تومان</span>
            </div>
            <div className="flex justify-between text-blue-600 font-semibold">
              <span>قیمت نهایی:</span>
              <span>{order.finalPrice.toLocaleString()} تومان</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
