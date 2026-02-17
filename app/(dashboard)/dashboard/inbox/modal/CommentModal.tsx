// "use client";
// import { X, CheckCircle } from "lucide-react";
// import Image from "next/image";
// import { toast } from "react-toastify";

// interface User {
//   _id: string;
//   username: string;
//   mobile: string;
// }

// interface Product {
//   _id: string;
//   title: string;
//   sku: string;
//   mainImage: string;
//   price: number;
// }

// interface Comment {
//   _id: string;
//   text: string;
//   rating: number;
//   verified: boolean;
//   user: User;
//   product: Product;
// }

// interface Target {
//   kind: "Comment";
//   item: Comment;
// }

// interface Notification {
//   _id: string;
//   target: Target;
// }

// interface CommentModalProps {
//   selected: Notification;
//   closeModal: () => void;
//   markAsRead: (id: string) => void;
// }

// export default function CommentModal({ selected, closeModal, markAsRead }: CommentModalProps) {
//   const comment = selected.target.item;
//   const product = comment.product;
//   const approve = async () => {
//     const res = await fetch(`/api/admin/notifications/approve`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id: comment._id }),
//     });
//     markAsRead(selected._id);
//     if (res.ok) {
//       toast.success("کامنت تایید شد");
//       closeModal();
//     } else {
//       toast.error("خطا در تایید کامنت");
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div
//         onClick={closeModal}
//         className="absolute inset-0 bg-black/40 backdrop-blur-sm"
//       ></div>

//       <div className="relative bg-white w-[520px] rounded-2xl p-5 shadow-xl animate-fadeIn">
//         <button
//           title="بستن"
//           onClick={closeModal}
//           className="absolute right-4 top-4"
//         >
//           <X size={20} />
//         </button>

//         <div className="flex gap-4 items-center mb-4 border-b pb-4">
//           <Image
//             alt="تصویر اصلی"
//             src={product.mainImage}
//             width={90}
//             height={90}
//             className="rounded-xl"
//           />
//           <div>
//             <h3 className="font-bold">{product.title}</h3>
//             <p className="text-xs text-gray-500">{product.sku}</p>
//             <p className="text-green-600 text-sm">
//               {product.price.toLocaleString()} تومان
//             </p>
//           </div>
//         </div>

//         <div className="bg-gray-50 p-3 rounded-xl mb-4">
//           <p className="text-sm">{comment.text}</p>
//           <p className="text-xs text-gray-500 mt-1">
//             امتیاز: ⭐ {comment.rating}
//           </p>
//           <p className="text-xs text-gray-500 mt-1">
//             توسط {comment.user.username}
//           </p>
//           <p className="text-xs text-gray-500 mt-1">
//             شماره موبایل {comment.user.mobile}
//           </p>
//         </div>

//         {!comment.verified && selected.target.kind === "Comment" && (
//           <button
//             onClick={approve}
//             className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl flex items-center justify-center gap-2"
//           >
//             <CheckCircle size={18} /> تایید کامنت
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { Comment, Notification } from "@/types/notifType";
import { CheckCircle, Loader2, Star, User2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

interface CommentModalProps {
  selected: Notification & {
    target: {
      kind: "Comment";
      item: Comment;
    };
  };
  closeModal: () => void;
  markAsRead: (id: string) => Promise<void> | void;
}

export default function CommentModal({
  selected,
  closeModal,
  markAsRead,
}: CommentModalProps) {
  const [isApproving, setIsApproving] = useState(false);

  const comment = selected.target.item;
  const product = comment?.product;

  const approve = async () => {
    if (!comment?._id || isApproving) return;

    try {
      setIsApproving(true);

      const res = await fetch(`/api/admin/notifications/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: comment._id }),
      });

      if (!res.ok) throw new Error();

      await markAsRead(selected._id);
      toast.success("کامنت با موفقیت تایید شد.");
      closeModal();
    } catch {
      toast.error("خطا در تایید کامنت");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="بستن"
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-6">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-600 hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <h3 className="mb-4 border-b border-gray-200 pb-3 text-lg font-bold text-gray-900">
          جزئیات دیدگاه کاربر
        </h3>

        <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          {product?.mainImage ? (
            <Image
              alt={product?.title || "تصویر محصول"}
              src={product.mainImage}
              width={84}
              height={84}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="h-[84px] w-[84px] rounded-lg bg-gray-200" />
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">
              {product?.title || "محصول نامشخص"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              SKU: {product?.sku || "---"}
            </p>
            <p className="mt-1 text-xs text-green-700">
              {product?.price ? product.price.toLocaleString() : "---"} تومان
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm leading-7 text-gray-800">
            {comment?.text || "---"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-2">
            <p className="inline-flex items-center gap-1">
              <Star size={14} className="text-amber-500" /> امتیاز:{" "}
              {comment?.rating ?? "---"}
            </p>
            <p className="inline-flex items-center gap-1">
              <User2 size={14} /> {comment?.user?.username || "کاربر نامشخص"}
            </p>
            <p>موبایل: {comment?.user?.mobile || "---"}</p>
            <p>وضعیت: {comment?.verified ? "تایید شده" : "در انتظار تایید"}</p>
          </div>
        </div>

        {!comment?.verified && (
          <button
            onClick={approve}
            disabled={isApproving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
          >
            {isApproving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            {isApproving ? "در حال تایید..." : "تایید دیدگاه"}
          </button>
        )}
      </div>
    </div>
  );
}
