"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore, Star, ThumbsUp, UserCircle2 } from "lucide-react";
import { Comment } from "@/types";
import { formatPrice } from "@/helpers/Price";
import ProductComments from "../../components/ProductComments";

interface CommentsListProps {
  comments: Comment[];
  productId: string;
  autoOpenComposer?: boolean;
  onComposerOpened?: () => void;
}

export const CommentsList = ({
  comments,
  productId,
  autoOpenComposer = false,
  onComposerOpened,
}: CommentsListProps) => {
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (autoOpenComposer) {
      setOpenModal(true);
      onComposerOpened?.();
    }
  }, [autoOpenComposer, onComposerOpened]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 border-r-4 border-red-500 pr-3">
            نظرات کاربران
          </h3>
          <p className="text-xs text-zinc-500 mt-2">
            تجربه خودتان را از این محصول با بقیه به اشتراک بگذارید.
          </p>
        </div>

        <button
          onClick={() => setOpenModal((prev) => !prev)}
          className="inline-flex items-center gap-2 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold bg-white hover:bg-indigo-50 transition-colors"
        >
          <MessageCircleMore className="h-4 w-4" />
          {openModal ? "بستن فرم دیدگاه" : "ثبت دیدگاه جدید"}
        </button>
      </div>

      {openModal && <ProductComments productId={productId} />}

      {comments.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-xl border border-dashed border-zinc-200">
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
                      {comment.user?.username || "کاربر مهمان"}
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
