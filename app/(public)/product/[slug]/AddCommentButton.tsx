"use client";

import { MessageCirclePlus } from "lucide-react";

export default function AddCommentButton() {
  const handleClick = () => {
    const commentsSection = document.getElementById("product-comments");
    commentsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new Event("open-product-comment"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
    >
      <MessageCirclePlus className="h-4 w-4" />
      افزودن دیدگاه
    </button>
  );
}
