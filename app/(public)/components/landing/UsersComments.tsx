// "use client"

// import { Star } from "lucide-react";
// import Link from "next/link";

// const blogHighlights = [
//   {
//     title: "راهنمای خرید پلی‌استیشن 5 در سال 1405",
//     description: "چه مدلی بخریم؟ نسخه دیجیتال یا دیسک‌خور؟ این راهنما کمک می‌کند تصمیم بهتری بگیرید.",
//     link: "/about-us",
//   },
//   {
//     title: "بهترین اکسسوری‌های ضروری برای گیمرها",
//     description: "از هدست تا پایه شارژر دسته؛ لیست کامل ابزارهایی که تجربه بازی را حرفه‌ای‌تر می‌کنند.",
//     link: "/products?sort=newest&category=gaming-accessories&page=1",
//   },
//   {
//     title: "چطور از اکانت و بازی‌های دیجیتال محافظت کنیم؟",
//     description: "نکات امنیتی مهم برای خرید، نگهداری و استفاده امن از بازی‌های اکانتی.",
//     link: "/products?sort=newest&category=account-games&page=1",
//   },
// ];
// // todo
// // اضافه کردن مقاله واقعی و ادرس مشاهده درست مقااله
// export default  function UsersComments() {

//   return (
//      <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6 md:p-8">
//           <div className="mb-5 flex items-center justify-between">
//             <h2 className="text-xl font-black text-slate-900 md:text-2xl">مطالب پیشنهادی برای خرید بهتر</h2>

//           </div>
//           <div className="grid gap-4 md:grid-cols-3">
//             {blogHighlights.map((post) => (
//               <article key={post.title} className="rounded-2xl bg-white p-5 shadow-sm">
//                 <h3 className="text-base font-bold text-slate-900">{post.title}</h3>
//                 <p className="mt-2 text-sm leading-6 text-slate-600">{post.description}</p>
//                 <Link href={post.link} className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900">
//                   مطالعه یا مشاهده
//                 </Link>
//               </article>
//             ))}
//           </div>
//         </section>
//   );
// }

// !بعد از ادیت دوم
import { BlogPost } from "@/types";
import Image from "next/image";
import Link from "next/link";

async function getBlogs(): Promise<BlogPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blog?limit=3`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  } catch {
    return [];
  }
}

export default async function UsersComments() {
  const blogs = await getBlogs();

  if (!blogs.length) return null;

  return (
    <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 md:text-2xl">
          جدیدترین مطالب وبلاگ
        </h2>

        <Link
          href="/blog"
          className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
        >
          مشاهده همه
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {blogs.map((post) => (
          <article
            key={post._id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="relative h-44 w-full bg-slate-100">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-contain"
                />
              ) : (
                <Image
                  src="/atari-seeklogo.svg"
                  alt={post.title}
                  fill
                  className="object-contain"
                />
              )}
            </div>

            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900">
                {post.title}
              </h3>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                {post.excerpt || post.content}
              </p>

              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900"
              >
                مطالعه مقاله
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
