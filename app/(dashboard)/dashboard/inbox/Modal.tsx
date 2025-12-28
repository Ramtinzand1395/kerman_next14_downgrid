"use client";
import { X, CheckCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
interface User {
  _id: string;
  username: string;
  mobile: string;
}

interface Product {
  _id: string;
  title: string;
  sku: string;
  mainImage: string;
  price: number;
}

interface Comment {
  _id: string;
  text: string;
  rating: number;
  verified: boolean;
  user: User;
  product: Product;
}

interface Target {
  kind: "Comment" | "Order" | "User" | "Product";
  item: Comment; // یا Order, Product و … بسته به kind
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "comment" | "order" | "user" | "payment";
  isRead: boolean;
  for: "admin" | "user";
  createdAt: string;
  target: Target;
}

interface ModalProps {
  selected: Notification;
  closeModal: () => void;
  markAsRead: (id: string) => void;
}

export default function Modal({ selected, closeModal, markAsRead }: ModalProps) {
  const comment = selected.target.item;
  const product = comment.product;
console.log(selected)
  const approve = async () => {
    const res = await fetch(`/api/admin/notifications/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment._id }),
    });
    markAsRead(selected._id);
    if (res.ok) {
      toast.success("کامنت تایید شد");
      closeModal();
    } else {
      toast.error("خطا در تایید کامنت");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      ></div>

      <div className="relative bg-white w-[520px] rounded-2xl p-5 shadow-xl animate-fadeIn">
        <button
          title="fsjk"
          onClick={closeModal}
          className="absolute right-4 top-4"
        >
          <X size={20} />
        </button>

        <div className="flex gap-4 items-center mb-4 border-b pb-4">
          <Image
            alt="تصویر اصلی"
            src={product.mainImage}
            width={90}
            height={90}
            className="rounded-xl"
          />
          <div>
            <h3 className="font-bold">{product.title}</h3>
            <p className="text-xs text-gray-500">{product.sku}</p>
            <p className="text-green-600 text-sm">
              {product.price.toLocaleString()} تومان
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl mb-4">
          <p className="text-sm">{comment.text}</p>
          <p className="text-xs text-gray-500 mt-1">
            امتیاز: ⭐ {comment.rating}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            توسط {comment.user.username}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            شماره موبایل {comment.user.mobile}
          </p>
        </div>

        {!comment.verified && selected.target.kind === "Comment" && (
          <button
            onClick={approve}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> تایید کامنت
          </button>
        )}
      </div>
    </div>
  );
}
