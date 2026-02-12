"use client";

import { MessageCircleQuestion } from "lucide-react";
const faqs = [
  {
    question: "چطور از اصالت کالا مطمئن باشم؟",
    answer:
      "تمام محصولات با ضمانت اصالت ارائه می‌شوند و قبل از ارسال توسط تیم ما بررسی نهایی انجام می‌شود.",
  },
  {
    question: "امکان مشاوره قبل از خرید وجود دارد؟",
    answer:
      "بله، تیم پشتیبانی ما به‌صورت روزانه پاسخگوی شماست تا بهترین گزینه را بر اساس بودجه و نیازتان انتخاب کنید.",
  },
  {
    question: "اگر محصول مشکل داشت، چه کار کنم؟",
    answer:
      "در صورت وجود هرگونه مشکل، از طریق صفحه تماس با ما یا پشتیبانی سفارش، موضوع را ثبت کنید تا فرایند پیگیری سریع انجام شود.",
  },
];
export default async function Faq() {
  return(

  <section className="mt-10 rounded-3xl bg-gradient-to-br from-[#377dff] to-[#001A6E] p-6 text-white md:p-8">
    <div className="mb-6 flex items-center gap-2 text-white">
      <MessageCircleQuestion size={20} />
      <span className="text-sm font-bold">سوالات پرتکرار</span>
    </div>
    <div className="space-y-3">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="rounded-xl border border-white/15 bg-white/5 p-4"
        >
          <summary className="cursor-pointer list-none font-bold">
            {faq.question}
          </summary>
          <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
        </details>
      ))}
    </div>
  </section>
  
  )
}
