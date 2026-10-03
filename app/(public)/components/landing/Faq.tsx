import { MessageCircleQuestion, Plus } from "lucide-react";
const faqs = [
  {
    question: "چطور نوبت حضوری بگیرم؟",
    answer:
      "از دکمه دریافت نوبت وارد حساب کاربری شوید، مدل کنسول و بازی‌ها یا خدمت موردنیازتان را انتخاب کنید و درخواست را ثبت کنید.",
  },
  {
    question: "برای نصب بازی چه اطلاعاتی لازم است؟",
    answer:
      "مدل کنسول، فضای ذخیره‌سازی در دسترس و فهرست بازی‌های مدنظرتان را در جریان ثبت نوبت مشخص کنید.",
  },
  {
    question: "ارسال با پیک فعال است؟",
    answer:
      "خیر. در حال حاضر دریافت خدمات فقط با مراجعه حضوری و هماهنگی قبلی انجام می‌شود و سرویس پیک به‌زودی اضافه خواهد شد.",
  },
  {
    question: "برای تعمیر کنسول از کجا شروع کنم؟",
    answer:
      "ابتدا صفحه خدمات را ببینید و برای هماهنگی مراجعه از مسیر دریافت نوبت یا تماس با فروشگاه اقدام کنید.",
  },
];
export default function Faq() {
  return (
    <section className="landing-section" aria-labelledby="landing-faq-heading">
      <div className="mb-6 flex items-center gap-3 md:mb-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
          <MessageCircleQuestion className="h-6 w-6" />
        </span>
        <div>
          <h2
            id="landing-faq-heading"
            className="text-2xl font-black text-slate-950 md:text-3xl"
          >
            سوالات پرتکرار
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            پاسخ کوتاه به پرسش‌های رایج خدمات حضوری
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:border-blue-200 open:shadow-md sm:p-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
              <span>{faq.question}</span>
              <Plus className="h-5 w-5 shrink-0 text-blue-700 transition group-open:rotate-45" />
            </summary>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-600">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
