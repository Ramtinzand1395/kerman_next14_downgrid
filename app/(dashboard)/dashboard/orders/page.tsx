// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Image from "next/image";
// import {
//   BadgeCheck,
//   BadgeDollarSign,
//   Clock3,
//   MapPin,
//   Package,
//   Phone,
//   ShoppingBag,
//   ShieldCheck,
//   Truck,
//   User,
// } from "lucide-react";

// import { formatPrice } from "@/helpers/Price";
// import { toPersianDate } from "@/helpers/toPersianDate";

// type OrderStatus =
//   | "pending"
//   | "processing"
//   | "shipped"
//   | "delivered"
//   | "cancelled";

// type OrderItem = {
//   _id: string;
//   quantity: number;
//   price: number;
//   product: {
//     mainImage: string;
//     title: string;
//     sku: string;
//   };
// };

// type Order = {
//   _id: string;
//   status: OrderStatus;
//   paymentStatus: string;
//   createdAt: string;
//   finalPrice: number;
//   user?: { username?: string; mobile?: string };
//   address?: {
//     province?: string;
//     city?: string;
//     plaque?: string;
//     unit?: string;
//     postalCode?: string;
//     address?: string;
//   };
//   items: OrderItem[];
// };

// type OrdersResponse = {
//   orders: Order[];
//   pages: number;
// };

// const statusMap: Record<OrderStatus, { title: string; color: string; badge: string }> =
//   {
//     pending: {
//       title: "در انتظار پردازش",
//       color: "text-amber-700 border-amber-300 bg-amber-50",
//       badge: "bg-amber-100 text-amber-700",
//     },
//     processing: {
//       title: "در حال پردازش",
//       color: "text-sky-700 border-sky-300 bg-sky-50",
//       badge: "bg-sky-100 text-sky-700",
//     },
//     shipped: {
//       title: "ارسال شده",
//       color: "text-violet-700 border-violet-300 bg-violet-50",
//       badge: "bg-violet-100 text-violet-700",
//     },
//     delivered: {
//       title: "تحویل داده شده",
//       color: "text-emerald-700 border-emerald-300 bg-emerald-50",
//       badge: "bg-emerald-100 text-emerald-700",
//     },
//     cancelled: {
//       title: "کنسل شده",
//       color: "text-rose-700 border-rose-300 bg-rose-50",
//       badge: "bg-rose-100 text-rose-700",
//     },
//   };

// export default function Orders() {
//   const [data, setData] = useState<OrdersResponse | null>(null);
//   const [page, setPage] = useState(1);

//   useEffect(() => {
//     fetch(`/api/admin/order?page=${page}`)
//       .then((r) => r.json())
//       .then(setData);
//   }, [page]);

//   const updateStatus = async (orderId: string, status: OrderStatus) => {
//     await fetch("/api/admin/order", {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ orderId, status }),
//     });

//     setData((prev) => {
//       if (!prev) return prev;
//       return {
//         ...prev,
//         orders: prev.orders.map((order) =>
//           order._id === orderId ? { ...order, status } : order
//         ),
//       };
//     });
//   };

//   const summary = useMemo(() => {
//     if (!data?.orders?.length) {
//       return { total: 0, paid: 0, waiting: 0, items: 0 };
//     }

//     return data.orders.reduce(
//       (acc, order) => {
//         acc.total += order.finalPrice;
//         acc.items += order.items.length;
//         if (order.paymentStatus === "paid") acc.paid += 1;
//         else acc.waiting += 1;
//         return acc;
//       },
//       { total: 0, paid: 0, waiting: 0, items: 0 }
//     );
//   }, [data]);

//   if (!data) {
//     return (
//       <div className="p-4 md:p-6">
//         <div className="h-72 rounded-3xl border border-dashed border-gray-300 animate-pulse bg-gray-50" />
//       </div>
//     );
//   }

//   return (
//     <section className="p-4 md:p-6 space-y-5 bg-gradient-to-b from-white to-slate-50 min-h-screen">
//       <div className="rounded-3xl border bg-white/80 backdrop-blur-sm p-4 md:p-6 shadow-sm">
//         <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//           <div>
//             <h1 className="text-xl md:text-2xl font-bold text-gray-800">
//               سفارش‌ها
//             </h1>
//             <p className="text-sm text-gray-500 mt-1">
//               مدیریت کامل سفارش‌ها با طراحی ریسپانسیو و نمایش سریع جزئیات
//             </p>
//           </div>
//           <span className="self-start md:self-auto rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600">
//             صفحه {page} از {data.pages}
//           </span>
//         </div>

//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
//           <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
//             <BadgeDollarSign className="w-5 h-5 text-emerald-600" />
//             <div>
//               <p className="text-xs text-gray-500">جمع مبلغ</p>
//               <p className="font-semibold text-sm">
//                 {formatPrice(summary.total)}
//               </p>
//             </div>
//           </div>

//           <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
//             <BadgeCheck className="w-5 h-5 text-sky-600" />
//             <div>
//               <p className="text-xs text-gray-500">پرداخت‌شده</p>
//               <p className="font-semibold text-sm">{summary.paid} سفارش</p>
//             </div>
//           </div>

//           <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
//             <Clock3 className="w-5 h-5 text-amber-600" />
//             <div>
//               <p className="text-xs text-gray-500">در انتظار پرداخت</p>
//               <p className="font-semibold text-sm">{summary.waiting} سفارش</p>
//             </div>
//           </div>

//           <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
//             <ShoppingBag className="w-5 h-5 text-violet-600" />
//             <div>
//               <p className="text-xs text-gray-500">تعداد آیتم‌ها</p>
//               <p className="font-semibold text-sm">{summary.items} آیتم</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Desktop table */}
//       <div className="hidden lg:block rounded-3xl border bg-white overflow-x-auto shadow-sm">
//         <table className="min-w-[1150px] w-full text-sm">
//           <thead className="bg-slate-100 text-slate-700">
//             <tr>
//               {[
//                 "#",
//                 "کاربر",
//                 "آدرس",
//                 "محصولات",
//                 "مبلغ",
//                 "پرداخت",
//                 "وضعیت",
//                 "تاریخ",
//               ].map((title) => (
//                 <th key={title} className="text-right py-3 px-4 font-semibold">
//                   {title}
//                 </th>
//               ))}
//             </tr>
//           </thead>

//           <tbody>
//             {data.orders.map((order, index) => (
//               <tr
//                 key={order._id}
//                 className="border-t hover:bg-slate-50/70 align-top"
//               >
//                 <td className="py-4 px-4 text-gray-500">
//                   {(page - 1) * 10 + index + 1}
//                 </td>

//                 <td className="py-4 px-4 min-w-[180px]">
//                   <p className="font-semibold text-gray-800">
//                     {order.user?.username || "-"}
//                   </p>
//                   <p className="text-xs text-gray-500 mt-1">
//                     {order.user?.mobile || "-"}
//                   </p>
//                 </td>

//                 <td className="py-4 px-4 min-w-[250px] text-xs leading-5 text-gray-700">
//                   <p>
//                     {order.address?.province}، {order.address?.city}، پلاک{" "}
//                     {order.address?.plaque}، واحد {order.address?.unit}
//                   </p>
//                   <p className="text-gray-500">
//                     کدپستی: {order.address?.postalCode}
//                   </p>
//                   <p>{order.address?.address}</p>
//                 </td>

//                 <td className="py-4 px-4 min-w-[280px] space-y-2">
//                   {order.items.map((item) => (
//                     <div key={item._id} className="flex gap-2 items-center">
//                       <Image
//                         src={item.product.mainImage}
//                         width={36}
//                         height={36}
//                         className="rounded-md object-cover"
//                         alt={item.product.title}
//                       />
//                       <div>
//                         <p className="text-sm font-medium text-gray-800">
//                           {item.product.title}
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           {item.quantity} × {formatPrice(item.price)} |{" "}
//                           {item.product.sku}
//                         </p>
//                       </div>
//                     </div>
//                   ))}
//                 </td>

//                 <td className="py-4 px-4 font-semibold text-gray-800">
//                   {formatPrice(order.finalPrice)}
//                 </td>

//                 <td className="py-4 px-4">
//                   <span
//                     className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
//                       order.paymentStatus === "paid"
//                         ? "bg-emerald-100 text-emerald-700"
//                         : "bg-orange-100 text-orange-700"
//                     }`}
//                   >
//                     {order.paymentStatus === "paid"
//                       ? "پرداخت شده"
//                       : "در انتظار"}
//                   </span>
//                 </td>

//                 <td className="py-4 px-4">
//                   <select
//                     title="تغییر وضعیت"
//                     value={order.status}
//                     onChange={(e) =>
//                       updateStatus(order._id, e.target.value as OrderStatus)
//                     }
//                     className={`rounded-full text-xs px-3 py-1 border font-medium ${statusMap[order.status].color}`}
//                   >
//                     {Object.entries(statusMap).map(([key, value]) => (
//                       <option key={key} value={key}>
//                         {value.title}
//                       </option>
//                     ))}
//                   </select>
//                 </td>

//                 <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
//                   {toPersianDate(order.createdAt)}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Mobile cards */}
//       <div className="lg:hidden space-y-3">
//         {data.orders.map((order, index) => (
//           <article
//             key={order._id}
//             className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
//           >
//             <div className="flex items-start justify-between gap-2">
//               <div>
//                 <p className="text-xs text-gray-500">
//                   سفارش #{(page - 1) * 10 + index + 1}
//                 </p>

//                 <p className="font-semibold text-gray-800 mt-1 flex items-center gap-1">
//                   <User className="w-4 h-4 text-gray-400" />
//                   {order.user?.username || "-"}
//                 </p>

//                 <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
//                   <Phone className="w-4 h-4" />
//                   {order.user?.mobile || "-"}
//                 </p>
//               </div>

//               <span
//                 className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusMap[order.status].badge}`}
//               >
//                 {statusMap[order.status].title}
//               </span>
//             </div>

//             <div className="text-xs text-gray-600 space-y-1">
//               <p className="flex items-center gap-1 font-medium text-gray-700">
//                 <MapPin className="w-4 h-4" /> آدرس
//               </p>
//               <p>
//                 {order.address?.province}، {order.address?.city}، پلاک{" "}
//                 {order.address?.plaque}، واحد {order.address?.unit}
//               </p>
//               <p>کدپستی: {order.address?.postalCode}</p>
//               <p>{order.address?.address}</p>
//             </div>

//             <div className="space-y-2">
//               {order.items.map((item) => (
//                 <div
//                   key={item._id}
//                   className="flex gap-2 items-center rounded-xl bg-slate-50 p-2"
//                 >
//                   <Image
//                     src={item.product.mainImage}
//                     width={38}
//                     height={38}
//                     className="rounded-md object-cover"
//                     alt={item.product.title}
//                   />
//                   <div className="min-w-0">
//                     <p className="text-sm font-medium text-gray-800 truncate">
//                       {item.product.title}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       {item.quantity} × {formatPrice(item.price)} |{" "}
//                       {item.product.sku}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div className="grid grid-cols-2 gap-2">
//               <div className="rounded-xl bg-slate-50 p-2 text-xs">
//                 <p className="text-gray-500">مبلغ نهایی</p>
//                 <p className="font-semibold text-gray-800 mt-1">
//                   {formatPrice(order.finalPrice)}
//                 </p>
//               </div>

//               <div className="rounded-xl bg-slate-50 p-2 text-xs">
//                 <p className="text-gray-500">وضعیت پرداخت</p>
//                 <p
//                   className={`font-semibold mt-1 ${
//                     order.paymentStatus === "paid"
//                       ? "text-emerald-600"
//                       : "text-orange-600"
//                   }`}
//                 >
//                   {order.paymentStatus === "paid"
//                     ? "پرداخت شده"
//                     : "در انتظار"}
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center justify-between gap-2 pt-1">
//               <div className="text-xs text-gray-500 flex items-center gap-1">
//                 <Package className="w-4 h-4" />
//                 {toPersianDate(order.createdAt)}
//               </div>

//               <select
//                 title="تغییر وضعیت"
//                 value={order.status}
//                 onChange={(e) =>
//                   updateStatus(order._id, e.target.value as OrderStatus)
//                 }
//                 className={`rounded-full text-xs px-3 py-1 border font-medium ${statusMap[order.status].color}`}
//               >
//                 {Object.entries(statusMap).map(([key, value]) => (
//                   <option key={key} value={key}>
//                     {value.title}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </article>
//         ))}
//       </div>

//       {/* Pagination */}
//       <div className="flex flex-wrap justify-center gap-2 pt-1">
//         {Array.from({ length: data.pages }).map((_, index) => (
//           <button
//             key={index}
//             onClick={() => setPage(index + 1)}
//             className={`h-9 min-w-9 px-3 rounded-full text-sm transition-colors ${
//               page === index + 1
//                 ? "bg-gray-900 text-white shadow"
//                 : "bg-white border text-gray-700 hover:bg-gray-100"
//             }`}
//           >
//             {index + 1}
//           </button>
//         ))}
//       </div>
//     </section>
//   );
// }

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Box,
  Clock3,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

type OrdersResponse = {
  orders: Array<{
    _id: string;
    user?: { username?: string; mobile?: string };
    address?: {
      province?: string;
      city?: string;
      plaque?: string;
      unit?: string;
      postalCode?: string;
      address?: string;
    };
    items: Array<{
      _id: string;
      quantity: number;
      product: {
        title: string;
        sku: string;
        images: string[];
      };
    }>;
    finalPrice: number;
    paymentStatus: "paid" | "unpaid";
    status: OrderStatus;
    createdAt: string;
  }>;
  pages: number;
};

const toPersianDate = (date: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const statusMap: Record<OrderStatus, { title: string; color: string; badge: string }> =
  {
    pending: {
      title: "در انتظار بررسی",
      color: "text-amber-700 border-amber-300 bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
    },
    processing: {
      title: "در حال پردازش",
      color: "text-sky-700 border-sky-300 bg-sky-50",
      badge: "bg-sky-100 text-sky-700",
    },
    shipped: {
      title: "ارسال شده",
      color: "text-violet-700 border-violet-300 bg-violet-50",
      badge: "bg-violet-100 text-violet-700",
    },
    delivered: {
      title: "تحویل داده شده",
      color: "text-emerald-700 border-emerald-300 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700",
    },
    cancelled: {
      title: "کنسل شده",
      color: "text-rose-700 border-rose-300 bg-rose-50",
      badge: "bg-rose-100 text-rose-700",
    },
  };

export default function Orders() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/admin/order?page=${page}`)
      .then((r) => r.json())
      .then(setData);
  }, [page]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await fetch("/api/admin/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.map((order) =>
          order._id === orderId ? { ...order, status } : order,
        ),
      };
    });
  };

  const summary = useMemo(() => {
    if (!data?.orders?.length) {
      return { total: 0, paid: 0, waiting: 0, items: 0 };
    }

    return data.orders.reduce(
      (acc, order) => {
        acc.total += order.finalPrice;
        acc.items += order.items.length;
        if (order.paymentStatus === "paid") acc.paid += 1;
        else acc.waiting += 1;
        return acc;
      },
      { total: 0, paid: 0, waiting: 0, items: 0 },
    );
  }, [data]);

  const filteredOrders = useMemo(() => {
    if (!data?.orders?.length) return [];

    const normalizedSearch = search.trim().toLowerCase();

    return data.orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;

      if (!normalizedSearch) return matchesStatus;

      const searchableFields = [
        order._id,
        order.user?.username,
        order.user?.mobile,
        order.address?.province,
        order.address?.city,
        order.address?.address,
        ...order.items.flatMap((item) => [item.product.title, item.product.sku]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableFields.includes(normalizedSearch);
    });
  }, [data, search, statusFilter]);

  if (!data) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-72 rounded-3xl border border-dashed border-gray-300 animate-pulse bg-gray-50" />
      </div>
    );
  }

  return (
    <section className="p-4 md:p-6 space-y-5 bg-gradient-to-b from-white to-slate-50 min-h-screen">
      <div className="rounded-3xl border bg-white/80 backdrop-blur-sm p-4 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              سفارش‌ها
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              مدیریت کامل سفارش‌ها با طراحی ریسپانسیو و نمایش سریع جزئیات
            </p>
          </div>

          <span className="self-start md:self-auto rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600">
            صفحه {page} از {data.pages}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
            <Box className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">مجموع فروش</p>
              <p className="font-semibold text-sm">{summary.total.toLocaleString("fa-IR")} تومان</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-sky-600" />
            <div>
              <p className="text-xs text-gray-500">پرداخت‌شده</p>
              <p className="font-semibold text-sm">{summary.paid} سفارش</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
            <Clock3 className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">در انتظار پرداخت</p>
              <p className="font-semibold text-sm">{summary.waiting} سفارش</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-violet-600" />
            <div>
              <p className="text-xs text-gray-500">تعداد آیتم‌ها</p>
              <p className="font-semibold text-sm">{summary.items} آیتم</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-white px-3 py-2">
            <label
              htmlFor="orders-search"
              className="text-xs text-gray-500 block mb-1"
            >
              جستجو (نام، موبایل، شهر، محصول، SKU یا شناسه سفارش)
            </label>
            <input
              id="orders-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="مثلاً: علی، 0912، ارسال، دسته بازی ..."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div className="rounded-2xl border bg-white px-3 py-2">
            <label
              htmlFor="orders-status-filter"
              className="text-xs text-gray-500 block mb-1"
            >
              فیلتر وضعیت سفارش
            </label>
            <select
              id="orders-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | OrderStatus)
              }
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="all">همه وضعیت‌ها</option>
              {Object.entries(statusMap).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          نمایش {filteredOrders.length} سفارش از {data.orders.length} سفارش این صفحه
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-3xl border bg-white overflow-x-auto shadow-sm">
        <table className="min-w-[1150px] w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {[
                "#",
                "کاربر",
                "آدرس",
                "محصولات",
                "مبلغ",
                "پرداخت",
                "وضعیت",
                "تاریخ",
              ].map((title) => (
                <th key={title} className="text-right py-3 px-4 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((order, index) => (
              <tr
                key={order._id}
                className="border-t hover:bg-slate-50/70 align-top"
              >
                <td className="py-4 px-4 text-gray-500">{index + 1}</td>

                <td className="py-4 px-4 min-w-[180px]">
                  <p className="font-semibold text-gray-800">
                    {order.user?.username || "-"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.user?.mobile || "-"}
                  </p>
                </td>

                <td className="py-4 px-4 min-w-[250px] text-xs leading-5 text-gray-700">
                  <p>
                    {order.address?.province}، {order.address?.city}، پلاک{" "}
                    {order.address?.plaque}، واحد {order.address?.unit}
                  </p>
                  <p className="text-gray-500">
                    کدپستی: {order.address?.postalCode}
                  </p>
                  <p>{order.address?.address}</p>
                </td>

                <td className="py-4 px-4 min-w-[280px] space-y-2">
                  {order.items.map((item) => (
                    <div key={item._id} className="flex gap-2 items-center">
                      <Image
                        src={item.product.images?.[0] || "/placeholder.png"}
                        alt={item.product.title}
                        width={36}
                        height={36}
                        className="rounded-lg border bg-white object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {item.product.title}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          SKU: {item.product.sku} • تعداد: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </td>

                <td className="py-4 px-4 font-bold text-gray-900 whitespace-nowrap">
                  {order.finalPrice.toLocaleString("fa-IR")} تومان
                </td>

                <td className="py-4 px-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      order.paymentStatus === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.paymentStatus === "paid"
                      ? "پرداخت‌شده"
                      : "در انتظار پرداخت"}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <select
                    title="تغییر وضعیت"
                    value={order.status}
                    onChange={(e) =>
                      updateStatus(order._id, e.target.value as OrderStatus)
                    }
                    className={`rounded-full text-xs px-3 py-1 border font-medium ${statusMap[order.status].color}`}
                  >
                    {Object.entries(statusMap).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.title}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                  {toPersianDate(order.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.map((order, index) => (
          <article
            key={order._id}
            className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">سفارش #{index + 1}</p>

                <p className="font-semibold text-gray-800 mt-1 flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-400" />
                  {order.user?.username || "-"}
                </p>

                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {order.user?.mobile || "-"}
                </p>
              </div>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusMap[order.status].badge}`}
              >
                {statusMap[order.status].title}
              </span>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <p className="flex items-center gap-1 font-medium text-gray-700">
                <MapPin className="w-4 h-4" /> آدرس
              </p>
              <p>
                {order.address?.province}، {order.address?.city}، پلاک{" "}
                {order.address?.plaque}، واحد {order.address?.unit}
              </p>
              <p className="text-gray-500">
                {order.address?.address} • کدپستی: {order.address?.postalCode}
              </p>
            </div>

            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                <ShoppingBag className="w-4 h-4" /> محصولات
              </p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item._id} className="flex items-center gap-2">
                    <Image
                      src={item.product.images?.[0] || "/placeholder.png"}
                      alt={item.product.title}
                      width={36}
                      height={36}
                      className="rounded-lg border bg-white object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.product.title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        SKU: {item.product.sku} • تعداد: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Package className="w-4 h-4" />
                {toPersianDate(order.createdAt)}
              </div>

              <select
                title="تغییر وضعیت"
                value={order.status}
                onChange={(e) =>
                  updateStatus(order._id, e.target.value as OrderStatus)
                }
                className={`rounded-full text-xs px-3 py-1 border font-medium ${statusMap[order.status].color}`}
              >
                {Object.entries(statusMap).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.title}
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">
          موردی با فیلتر یا عبارت جستجوی انتخابی پیدا نشد.
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {Array.from({ length: data.pages }).map((_, index) => (
          <button
            key={index}
            onClick={() => setPage(index + 1)}
            className={`h-9 min-w-9 px-3 rounded-full text-sm transition-colors ${
              page === index + 1
                ? "bg-gray-900 text-white shadow"
                : "bg-white border text-gray-700 hover:bg-gray-100"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
