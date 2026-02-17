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
