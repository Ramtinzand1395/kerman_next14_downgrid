"use client";
import { useState } from "react";
import { toast } from "react-toastify";
interface ProductCommentsProps {
  productId: number; // یا string اگر اینطور است
}

export default function ProductComments({ productId }: ProductCommentsProps) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  const submitComment = async () => {
    if (!text) return alert("متن کامنت را وارد کنید");

    setLoading(true);
    const res = await fetch(`/api/products/comments`, {
      method: "POST",
      body: JSON.stringify({ productId, text, rating }),
    });
    setLoading(false);
    toast.success("نظر شما ثبت و بعد از تایید ابلاغ میشه");
    if (res.ok) {
      window.location.reload();
    } else {
      alert("خطا در ارسال کامنت");
    }
  };

  return (
    <div className="mt-16">
      {/* فرم ارسال */}
      <div className="mt-10 border p-6 rounded-xl">
        <h3 className="font-bold mb-3">ارسال نظر</h3>

        <textarea
          className="w-full border rounded-xl p-3"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="نظر خود را بنویسید..."
        />

        <div className="flex items-center gap-3 mt-4">
          <label>امتیاز:</label>
          <select
            title="rating"
            className="border p-2 rounded-lg"
            value={rating}
            onChange={(e) => setRating(+e.target.value)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={submitComment}
          disabled={loading}
          className="mt-5 bg-blue-600 text-white py-3 rounded-xl w-full"
        >
          {loading ? "درحال ارسال..." : "ثبت نظر"}
        </button>
      </div>
    </div>
  );
}
