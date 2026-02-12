"use client"

import { Star } from "lucide-react";
import Link from "next/link";

const blogHighlights = [
  {
    title: "راهنمای خرید پلی‌استیشن 5 در سال 1405",
    description: "چه مدلی بخریم؟ نسخه دیجیتال یا دیسک‌خور؟ این راهنما کمک می‌کند تصمیم بهتری بگیرید.",
    link: "/about-us",
  },
  {
    title: "بهترین اکسسوری‌های ضروری برای گیمرها",
    description: "از هدست تا پایه شارژر دسته؛ لیست کامل ابزارهایی که تجربه بازی را حرفه‌ای‌تر می‌کنند.",
    link: "/products?sort=newest&category=gaming-accessories&page=1",
  },
  {
    title: "چطور از اکانت و بازی‌های دیجیتال محافظت کنیم؟",
    description: "نکات امنیتی مهم برای خرید، نگهداری و استفاده امن از بازی‌های اکانتی.",
    link: "/products?sort=newest&category=account-games&page=1",
  },
];
// todo
// اضافه کردن مقاله واقعی و ادرس مشاهده درست مقااله
export default async function UsersComments() {

  return (
     <section className="mt-8 rounded-3xl border border-amber-100 bg-amber-50 p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 md:text-2xl">مطالب پیشنهادی برای خرید بهتر</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
              <Star size={14} />
              مطالعه سریع
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {blogHighlights.map((post) => (
              <article key={post.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{post.description}</p>
                <Link href={post.link} className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900">
                  مطالعه یا مشاهده
                </Link>
              </article>
            ))}
          </div>
        </section>
  );
}
