"use client";
import { useEffect, useState } from "react";
import { formatPrice } from "@/helpers/Price";
import { toPersianDate } from "@/helpers/toPersianDate";
import Image from "next/image";

const statusMap: any = {
  pending: {
    title: "در انتظار پردازش",
    color: "bg-yellow-100 text-yellow-700",
  },
  processing: { title: "در حال پردازش", color: "bg-blue-100 text-blue-700" },
  shipped: { title: "ارسال شده", color: "bg-purple-100 text-purple-700" },
  delivered: { title: "تحویل داده شده", color: "bg-green-100 text-green-700" },
  cancelled: { title: "کنسل شده", color: "bg-red-100 text-red-700" },
};

export default function Orders() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/order?page=${page}`)
      .then((r) => r.json())
      .then(setData);
  }, [page]);

  const updateStatus = async (orderId: string, status: string) => {
    await fetch("/api/admin/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    setData((prev: any) => ({
      ...prev,
      orders: prev.orders.map((o: any) =>
        o._id === orderId ? { ...o, status } : o
      ),
    }));
  };

  if (!data) return null;

  return (
    <div className="p-4 overflow-x-auto">
      <table className="min-w-[1200px] w-full text-sm border rounded-xl overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th>#</th>
            <th>کاربر</th>
            <th>موبایل</th>
            <th>آدرس</th>
            <th>محصولات</th>
            <th>مبلغ</th>
            <th>پرداخت</th>
            <th>وضعیت</th>
            <th>تاریخ</th>
          </tr>
        </thead>

        <tbody>
          {data.orders.map((o: any, i: number) => (
            <tr key={o._id} className="border-b hover:bg-gray-50 align-top">
              <td>{(page - 1) * 10 + i + 1}</td>
              <td>{o.user?.username}</td>
              <td>{o.user?.mobile}</td>
              <td className="max-w-[240px] text-xs leading-5">
                {o.address?.province}، {o.address?.city}، پلاک{" "}
                {o.address?.plaque}، واحد {o.address?.unit}
                <div className="text-gray-400">
                  کدپستی: {o.address?.postalCode}
                </div>
                <div>{o.address?.address}</div>
              </td>

              <td className="space-y-2">
                {o.items.map((i: any) => (
                  <div key={i._id} className="flex gap-2 items-center">
                    <Image
                      src={i.product.mainImage}
                      width={30}
                      height={30}
                      className="rounded"
                      alt=""
                    />
                    <div>
                      <div className="font-medium">{i.product.title}</div>
                      <div className="text-xs text-gray-400">
                        {i.quantity} × {formatPrice(i.price)} | {i.product.sku}
                      </div>
                    </div>
                  </div>
                ))}
              </td>

              <td>{formatPrice(o.finalPrice)}</td>

              <td
                className={
                  o.paymentStatus === "paid"
                    ? "text-green-600"
                    : "text-orange-500"
                }
              >
                {o.paymentStatus === "paid" ? "پرداخت شده" : "در انتظار"}
              </td>

              <td>
                <select
                  title="تغییر وضعیت"
                  value={o.status}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                  className={`rounded-full text-xs px-3 py-1 border ${
                    statusMap[o.status].color
                  }`}
                >
                  {Object.entries(statusMap).map(([k, v]: any) => (
                    <option key={k} value={k}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </td>

              <td>{toPersianDate(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: data.pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 rounded ${
              page === i + 1 ? "bg-black text-white" : "border"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
