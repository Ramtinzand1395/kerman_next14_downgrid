"use client";

import { storeOrder } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { toPersianDate } from "@/helpers/toPersianDate";
import { useSearchParams } from "next/navigation";
import FilterOrders from "../modals/FilterOrders";
import OrderSkeleton from "../modals/OrderSkeleton";

export default function AllStoreOrders() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<storeOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // هر بار page یا searchParams تغییر کرد، داده‌ها fetch می‌شود
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());

        const res = await fetch(
          `/api/admin/store-order/all-orders?${params.toString()}`
        );
        const data = await res.json();

        setOrders(data.orders);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        console.error(err);
        toast.error("خطای سرور");
      }
    };

    fetchOrders();
  }, [searchParams, page]);

  return (
    <div className="w-full md:container md:mx-auto mx-2 my-10">
      <FilterOrders />

      <table className="min-w-full text-sm font-light text-surface my-10">
        <thead className="border-b text-gray-500 border-neutral-300 font-medium">
          <tr>
            <th className="px-6 py-4 text-start">نام خانوادگی</th>
            <th className="px-6 py-4 text-start">موبایل</th>
            <th className="px-6 py-4 text-start">دستگاه</th>
            <th className="px-6 py-4 text-start">لیست</th>
            <th className="px-6 py-4 text-start">تاریخ سفارش</th>
            <th className="px-6 py-4 text-start">تاریخ تحویل</th>
            <th className="px-6 py-4 text-start">قیمت</th>
            <th className="px-6 py-4 text-start">توضیحات</th>
          </tr>
        </thead>

        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr key={order._id} className="hover:bg-neutral-100">
                <td className="px-6 py-4">
                  {typeof order.customer === "object"
                    ? order.customer.lastName
                    : "نامشخص"}
                </td>
                <td className="px-6 py-4">
                  {typeof order.customer === "object"
                    ? order.customer.mobile
                    : order.customer || "نامشخص"}
                </td>

                <td className="px-6 py-4">{order.consoleType}</td>
                <td className="px-6 py-4 text-xs">
                  {order.list.map((item, idx) => (
                    <div key={idx}>{item}</div>
                  ))}
                </td>
                <td className="px-6 py-4">{toPersianDate(order.createdAt)}</td>
                <td className="px-6 py-4">{order.deliveryDate}</td>
                <td className="px-6 py-4">{order.price}</td>
                <td className="px-6 py-4 text-xs">
                  {order.description || "توضیحاتی وجود ندارد"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center py-4">
                <OrderSkeleton rows={10} />
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-6 py-4">
        <span className="text-sm text-gray-500">
          نمایش {(page - 1) * 10 + 1} تا {Math.min(page * 10, total)} از {total}{" "}
          نتیجه
        </span>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            قبلی
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
}
