import { Plus } from "lucide-react";
const faqs = [
  {
    question: "چطور نوبت حضوری بگیرم؟",
    answer:
      "از دکمه ثبت درخواست حضوری وارد حساب کاربری شوید، مدل کنسول و بازی‌ها یا خدمت موردنیازتان را انتخاب کنید. فروشگاه برای هماهنگی مراجعه با شما تماس می‌گیرد.",
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
    <section
      className="landing-section landing-panel p-2"
      aria-labelledby="landing-faq-heading"
    >
      <div className="mb-2 text-center">
        <div>
          <h2
            id="landing-faq-heading"
            className="text-base font-black text-[#0b1d48] sm:text-lg"
          >
            سوالات پرتکرار
          </h2>
          <p className="text-[10px] text-slate-400">
            پاسخ کوتاه به پرسش‌های رایج خدمات حضوری
          </p>
        </div>
      </div>
      <div className="space-y-1">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            open={index === 0}
            className="group rounded-md border border-[#e2ebfb] bg-white px-2 py-0.5 open:border-blue-200 open:bg-[#f7faff]"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[8px] font-black text-[#0b1d48] sm:min-h-4 sm:text-[9px]">
              <span>{faq.question}</span>
              <Plus className="h-4 w-4 shrink-0 text-[#1469f5] transition group-open:rotate-45" />
            </summary>
            <p className="mt-1 border-t border-slate-100 pt-1 text-[7px] leading-3 text-slate-500 sm:text-[8px]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
