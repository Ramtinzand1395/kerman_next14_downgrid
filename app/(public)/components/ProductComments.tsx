// "use client";
// import { useState } from "react";
// import { toast } from "react-toastify";
// interface ProductCommentsProps {
//   productId: string; // یا string اگر اینطور است
// }

// export default function ProductComments({ productId }: ProductCommentsProps) {
//   const [text, setText] = useState("");
//   const [rating, setRating] = useState(5);
//   const [loading, setLoading] = useState(false);

//   const submitComment = async () => {
//     if (!text) return alert("متن کامنت را وارد کنید");
//     setLoading(true);
//     const res = await fetch(`/api/products/comments`, {
//       method: "POST",
//       body: JSON.stringify({ productId, text, rating }),
//     });
//     const data = await res.json();
//     console.log(data)
//     setLoading(false);
//     toast.success(data.message);
//   };

//   return (
//     <div className="mt-16">
//       {/* فرم ارسال */}
//       <div className="mt-10 border p-6 rounded-xl">
//         <h3 className="font-bold mb-3">ارسال نظر</h3>

//         <textarea
//           className="w-full border rounded-xl p-3"
//           rows={4}
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           placeholder="نظر خود را بنویسید..."
//         />

//         <div className="flex items-center gap-3 mt-4">
//           <label>امتیاز:</label>
//           <select
//             title="rating"
//             className="border p-2 rounded-lg"
//             value={rating}
//             onChange={(e) => setRating(+e.target.value)}
//           >
//             {[1, 2, 3, 4, 5].map((n) => (
//               <option key={n} value={n}>
//                 {n}
//               </option>
//             ))}
//           </select>
//         </div>

//         <button
//           onClick={submitComment}
//           disabled={loading}
//           className="mt-5 bg-blue-600 text-white py-3 rounded-xl w-full"
//         >
//           {loading ? "درحال ارسال..." : "ثبت نظر"}
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface ProductCommentsProps {
  productId: string;
}

export default function ProductComments({ productId }: ProductCommentsProps) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  const submitComment = async () => {
    if (!text.trim()) {
      toast.error("متن دیدگاه را وارد کنید");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/products/comments`, {
      method: "POST",
      body: JSON.stringify({ productId, text, rating }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data?.message || "ثبت دیدگاه با خطا روبه‌رو شد");
      return;
    }

    setText("");
    setRating(5);
    toast.success(data.message || "دیدگاه شما ثبت شد");
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 md:p-6">
      <h3 className="font-bold text-zinc-800">ارسال دیدگاه</h3>
      <p className="mt-1 text-xs text-zinc-500">
        لطفاً نظر واقعی خودتان را درباره کیفیت و تجربه استفاده بنویسید.
      </p>

      <textarea
        className="mt-4 w-full border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="نظر خود را بنویسید..."
      />

      <div className="flex items-center gap-3 mt-4">
        <label htmlFor="rating" className="text-sm font-medium text-zinc-700">
          امتیاز:
        </label>

        <select
          id="rating"
          title="rating"
          className="border border-zinc-200 bg-white p-2 rounded-lg text-sm"
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
        className="mt-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white py-3 rounded-xl w-full text-sm font-bold transition-colors"
      >
        {loading ? "درحال ارسال..." : "ثبت دیدگاه"}
      </button>
    </div>
  );
}
