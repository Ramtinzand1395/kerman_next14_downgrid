"use client";
import { useState } from "react";
import { Star, ThumbsUp, UserCircle2 } from "lucide-react";
import { Comment } from "@/types";
import { formatPrice } from "@/helpers/Price";
import ProductComments from "../../components/ProductComments";

interface CommentsListProps {
  comments: Comment[];
  productId: string;
}

export const CommentsList = ({ comments, productId }: CommentsListProps) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 border-r-4 border-red-500 pr-3">
          نظرات کاربران
        </h3>
        <button
          onClick={() => setOpenModal(true)}
          className="text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
        >
          ثبت دیدگاه جدید
        </button>
      </div>
      {openModal && <ProductComments productId={productId} />}

      {comments.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-xl">
          هنوز نظری برای این محصول ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">
                      {comment.user?.username || "کاربر مهمان"}{" "}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(comment.createdAt).toLocaleDateString("fa-IR")}
                    </div>
                  </div>
                  {comment.verified && (
                    <span className="mr-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-full border border-emerald-100 font-medium">
                      خریدار
                    </span>
                  )}
                </div>
                <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                  <span className="text-sm font-bold text-yellow-700 ml-1 pt-1">
                    {formatPrice(comment.rating)}
                  </span>
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-7 mb-4">
                {comment.text}
              </p>

              <div className="flex items-center justify-end gap-4 text-xs text-gray-400">
                <button className="flex items-center gap-1 hover:text-green-600 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  مفید بود
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
