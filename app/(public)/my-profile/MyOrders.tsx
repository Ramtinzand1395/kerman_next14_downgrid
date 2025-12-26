"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
// import SkeletonOrder from "../components/SkeletonOrder";

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

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users_data/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // if (loading) {
  //   return (
  //     <div>
  //       <SkeletonOrder />
  //       <SkeletonOrder />
  //       <SkeletonOrder />
  //     </div>
  //   );
  // }

  if (!orders.length) {
    return <p>هیچ سفارشی ثبت نشده است.</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border p-4 rounded-md shadow">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold">سفارش #{order.id}</p>
            <p className="text-gray-500">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="mb-2">
            <p className="text-sm text-gray-600">
              وضعیت: <span className="font-semibold">{order.status}</span>
            </p>
            {order.address && (
              <p className="text-sm text-gray-600">
                آدرس: {order.address.province} - {order.address.city} -{" "}
                {order.address.address}
              </p>
            )}
          </div>

          <div className="flex space-x-2 overflow-x-auto">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-col items-center">
                <Image
                  width={50}
                  height={50}
                  src={item.product.mainImage}
                  alt={item.product.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <p className="text-xs mt-1">{item.product.title}</p>
                <p className="text-xs text-gray-500">تعداد: {item.quantity}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 text-sm">
            <p>جمع کل: {order.totalPrice.toLocaleString()} تومان</p>
            <p>قیمت نهایی: {order.finalPrice.toLocaleString()} تومان</p>
          </div>
        </div>
      ))}
    </div>
  );
}
