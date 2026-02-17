// import { formatPrice } from "@/helpers/Price";
// import { toPersianDate } from "@/helpers/toPersianDate";
// import { Order } from "@/types";
// import Image from "next/image";
// import { toast } from "react-toastify";

// interface Target {
//   kind: "Order";
//   item: Order;
// }

// interface UserNotification {
//   _id: string;
//   target: Target;
// }

// interface OrderModalProps {
//   selected: UserNotification;
//   closeModal: () => void;
// }
// const OrderModal = ({ closeModal, selected }: OrderModalProps) => {
//   const order = selected.target.item;
//   const user = order.user;
//   const items = order.items;

//   const changeToProcessing = async (orderId: string) => {
//     const res = await fetch(`/api/admin/order`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ status: "processing", orderId }),
//     });

//     if (res.ok) {
//       toast.success("سفارش وارد مرحله پردازش شد");
//       // router.refresh();
//     } else {
//       toast.error("خطا در تغییر وضعیت");
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div
//         onClick={closeModal}
//         className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//       />

//       <div className="relative bg-white w-full max-w-3xl mx-4 rounded-2xl shadow-xl animate-fadeIn overflow-hidden">
//         {/* Header */}
//         <div className="p-5 border-b bg-gray-50">
//           <h2 className="font-bold text-lg">جزئیات سفارش</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             {toPersianDate(order.createdAt)}
//           </p>
//         </div>

//         {/* User Info */}
//         <div className="grid grid-cols-2 gap-4 p-5 text-sm">
//           <div>
//             <span className="text-gray-500">نام مشتری</span>
//             <p className="font-semibold">{user?.username}</p>
//           </div>
//           <div>
//             <span className="text-gray-500">شماره تماس</span>
//             <p className="font-semibold">{user?.mobile}</p>
//           </div>
//           <div>
//             <div className="">
//               <span className="text-gray-500">وضعیت پرداخت</span>
//               <span
//                 className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
//                   order.paymentStatus === "paid"
//                     ? "bg-green-100 text-green-700"
//                     : "bg-yellow-100 text-yellow-700"
//                 }`}
//               >
//                 {order.paymentStatus === "paid"
//                   ? "پرداخت شده"
//                   : "در انتظار پرداخت"}
//               </span>
//             </div>
//             <div className="">
//               <span className="text-gray-500">وضعیت سفارش</span>

//               <span
//                 className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
//                   order.status === "pending"
//                     ? "bg-yellow-100 text-yellow-700"
//                     : "bg-green-100 text-green-700"
//                 }`}
//               >
//                 {order.status === "pending" ? "در انتظار پردازش" : "پردازش شده"}
//               </span>
//             </div>
//           </div>
//           <div>
//             <span className="text-gray-500">مبلغ کل</span>
//             <p className="font-bold text-primary">
//               {formatPrice(order.finalPrice)} تومان
//             </p>
//           </div>
//         </div>

//         {/* Products Table */}
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm text-right border-t">
//             <thead className="bg-gray-100 text-gray-600">
//               <tr>
//                 <th className="p-3">تصویر</th>
//                 <th className="p-3">محصول</th>
//                 <th className="p-3">قیمت</th>
//                 <th className="p-3">تعداد</th>
//                 <th className="p-3">جمع</th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.map((i) => (
//                 <tr key={i._id} className="border-b hover:bg-gray-50">
//                   <td className="p-2">
//                     <Image
//                       src={i.product?.mainImage}
//                       width={45}
//                       height={45}
//                       className="rounded-lg"
//                       alt={i.product?.title}
//                     />
//                   </td>
//                   <td className="p-2 font-medium">{i.product?.title}</td>
//                   <td className="p-2">{formatPrice(i.price)} تومان</td>
//                   <td className="p-2 text-center">{i.quantity}</td>
//                   <td className="p-2 font-semibold">
//                     {formatPrice(i.total)} تومان
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {order.status === "pending" && (
//             <button
//               onClick={() => changeToProcessing(order._id)}
//               className="bg-yellow-500 text-white px-3 py-1 rounded"
//             >
//               شروع پردازش
//             </button>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex justify-end p-4 bg-gray-50">
//           <button
//             onClick={closeModal}
//             className="px-5 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
//           >
//             بستن
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OrderModal;

"use client";

import { formatPrice } from "@/helpers/Price";
import { toPersianDate } from "@/helpers/toPersianDate";
import { Notification } from "@/types/notifType";
import { PackageCheck, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

interface OrderModalProps {
  selected: Notification & {
    target: {
      kind: "Order";
      item: any;
    };
  };
  closeModal: () => void;
}

const statusLabel: Record<string, string> = {
  pending: "در انتظار پردازش",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

const OrderModal = ({ closeModal, selected }: OrderModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const order = selected.target.item;
  const user = order?.user;
  const items = order?.items || [];

  const changeToProcessing = async (orderId: string) => {
    if (!orderId || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/admin/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing", orderId }),
      });

      if (!res.ok) throw new Error();

      toast.success("سفارش وارد مرحله پردازش شد");
      closeModal();
    } catch {
      toast.error("خطا در تغییر وضعیت سفارش");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="بستن"
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 rounded-lg p-1 text-gray-600 hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="border-b bg-gray-50 p-5">
          <h2 className="text-lg font-bold">جزئیات سفارش</h2>
          <p className="mt-1 text-sm text-gray-500">
            {order?.createdAt ? toPersianDate(order.createdAt) : "---"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">نام مشتری</span>
            <p className="font-semibold">{user?.username || "نامشخص"}</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">شماره تماس</span>
            <p className="font-semibold">{user?.mobile || "نامشخص"}</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">وضعیت پرداخت</span>
            <p className="mt-1 font-semibold text-gray-900">
              {order?.paymentStatus === "paid"
                ? "پرداخت شده"
                : "در انتظار پرداخت"}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">وضعیت سفارش</span>
            <p className="mt-1 font-semibold text-gray-900">
              {statusLabel[order?.status] || "نامشخص"}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 md:col-span-2">
            <span className="text-gray-500">مبلغ کل</span>
            <p className="font-bold text-primary">
              {formatPrice(order?.finalPrice || 0)} تومان
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-y">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3">تصویر</th>
                <th className="p-3">محصول</th>
                <th className="p-3">قیمت</th>
                <th className="p-3">تعداد</th>
                <th className="p-3">جمع</th>
              </tr>
            </thead>

            <tbody>
              {items.length > 0 ? (
                items.map((i: any) => (
                  <tr key={i._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {i.product?.mainImage ? (
                        <Image
                          src={i.product.mainImage}
                          width={45}
                          height={45}
                          className="rounded-lg"
                          alt={i.product?.title || "محصول"}
                        />
                      ) : (
                        <div className="h-[45px] w-[45px] rounded-lg bg-gray-200" />
                      )}
                    </td>

                    <td className="p-2 font-medium">
                      {i.product?.title || "---"}
                    </td>

                    <td className="p-2">{formatPrice(i.price || 0)} تومان</td>

                    <td className="p-2 text-center">{i.quantity || 0}</td>

                    <td className="p-2 font-semibold">
                      {formatPrice(i.total || 0)} تومان
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    آیتمی برای این سفارش ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-end gap-2 bg-gray-50 p-4">
          {order?.status === "pending" && (
            <button
              onClick={() => changeToProcessing(order._id)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-yellow-300"
            >
              <PackageCheck size={16} />
              {isSubmitting ? "در حال ثبت..." : "شروع پردازش"}
            </button>
          )}

          <button
            onClick={closeModal}
            className="rounded-xl bg-gray-900 px-5 py-2 text-white transition hover:bg-gray-800"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;
