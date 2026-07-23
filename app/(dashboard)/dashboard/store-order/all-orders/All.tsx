"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { storeOrder } from "@/types";
import { toPersianDate } from "@/helpers/toPersianDate";

import FilterOrders from "../modals/FilterOrders";
import OrderSkeleton from "../modals/OrderSkeleton";

const ITEMS_PER_PAGE = 10;

/* ================= helpers ================= */
const calcTotals = (list: any[] = []) => {
  return list.reduce(
    (acc, item) => {
      acc.price += item?.price || 0;
      acc.size += item?.size || 0;
      return acc;
    },
    { price: 0, size: 0 },
  );
};

/* ================= component ================= */
export default function AllStoreOrders() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<storeOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ================= fetch ================= */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", String(ITEMS_PER_PAGE));
        params.set("page", String(page));

        const res = await fetch(
          `/api/admin/store-order/all-orders?${params.toString()}`,
        );

        const data = await res.json();

        setOrders(data.orders ?? []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } catch (err) {
        console.error(err);
        toast.error("خطای سرور");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [searchParams, page]);

  /* ================= pagination info ================= */
  const from = useMemo(
    () => (total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1),
    [page, total],
  );

  const to = useMemo(
    () => Math.min(page * ITEMS_PER_PAGE, total),
    [page, total],
  );

  /* ================= UI ================= */
  return (
    <div className="w-full md:container md:mx-auto mx-2 my-10">
      <FilterOrders />

      <div className="rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          {/* HEADER */}
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="p-3 text-right">مشتری</th>
              <th className="p-3 text-right">موبایل</th>
              <th className="p-3 text-right">دستگاه</th>
              <th className="p-3 text-right">لیست</th>
              <th className="p-3 text-right">جمع</th>
              <th className="p-3 text-right">تاریخ سفارش</th>
              <th className="p-3 text-right">تحویل</th>
              <th className="p-3 text-right">قیمت کل</th>
              <th className="p-3 text-right">توضیحات</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-5 text-center">
                  <OrderSkeleton rows={10} />
                </td>
              </tr>
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const totals = calcTotals(order.list);

                return (
                  <tr key={order._id} className="hover:bg-gray-50">
                    {/* CUSTOMER */}
                    <td className="p-3">
                      {typeof order.customer === "object"
                        ? order.customer.lastName
                        : "نامشخص"}
                    </td>

                    {/* MOBILE */}
                    <td className="p-3">
                      {typeof order.customer === "object"
                        ? order.customer.mobile
                        : "-"}
                    </td>

                    {/* CONSOLE */}
                    <td className="p-3">{order.consoleType}</td>

                    {/* LIST */}
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {order.list?.map((item) => (
                          <span
                            key={item._id}
                            className="bg-gray-100 px-2 py-1 rounded-md w-fit text-xs"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="p-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span>💰 {totals.price.toLocaleString()}</span>
                        <span>📦 {totals.size}</span>
                      </div>
                    </td>

                    {/* DATE */}
                    <td className="p-3">{toPersianDate(order.createdAt)}</td>

                    {/* DELIVERY */}
                    <td className="p-3">{order.deliveryDate}</td>

                    {/* PRICE */}
                    <td className="p-3 font-medium">
                      {order.price?.toLocaleString()}
                    </td>

                    {/* DESC */}
                    <td className="p-3 text-xs text-gray-600">
                      {order.description || "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-10 text-center text-gray-500">
                  سفارشی پیدا نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">
          نمایش {from} تا {to} از {total}
        </span>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            قبلی
          </button>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
}
