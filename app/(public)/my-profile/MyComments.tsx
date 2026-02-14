"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { MessageSquareText, ShieldCheck, Star } from "lucide-react";

interface Comment {
  id: number;
  text: string;
  rating: number;
  verified: boolean;
  createdAt: string;
  product: {
    title: string;
    mainImage: string;
  };
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function MyComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/profile/comments`);
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  const averageRating = useMemo(() => {
    if (!comments.length) {
      return 0;
    }

    const total = comments.reduce((sum, item) => sum + item.rating, 0);
    return (total / comments.length).toFixed(1);
  }, [comments]);

  if (loading) {
    return (
      <div className="space-y-4 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white">
            <div className="flex items-center gap-4">
              <Skeleton width={70} height={70} borderRadius={10} />
              <div className="flex-1 space-y-2">
                <Skeleton width={170} height={18} />
                <Skeleton width="85%" height={14} />
                <Skeleton width={120} height={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!comments.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <MessageSquareText className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <p className="text-slate-700 font-medium">هنوز نظری ثبت نکرده‌اید.</p>
        <p className="text-sm text-slate-500 mt-1">
          پس از ثبت دیدگاه روی محصولات، اینجا نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">مرکز نظرات شما</p>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-1">
            {comments.length} دیدگاه ثبت شده
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 text-amber-700 px-4 py-2">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          <p className="text-sm font-semibold">میانگین امتیاز: {averageRating}</p>
        </div>
      </header>

      {comments.map((comment) => (
        <article
          key={comment.id}
          className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <Image
              width={80}
              height={80}
              src={comment.product.mainImage}
              alt={comment.product.title}
              className="w-20 h-20 object-cover rounded-lg border border-slate-200"
            />

            <div className="flex-1 space-y-2">
              <div className="flex items-start md:items-center justify-between gap-2 flex-col md:flex-row">
                <p className="font-semibold text-slate-800">{comment.product.title}</p>
                <p className="text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
              </div>

              <p className="text-sm text-slate-600 leading-7">{comment.text}</p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span
                  className={`text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                    comment.verified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {comment.verified ? "تایید شده" : "در انتظار تایید"}
                </span>

                <span className="text-xs inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {comment.rating} از 5
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
