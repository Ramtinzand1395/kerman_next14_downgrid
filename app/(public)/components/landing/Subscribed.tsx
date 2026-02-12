"use client";

const Subscribed = () => {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center md:p-8">
      <h2 className="text-2xl font-black text-slate-900">
        عضویت در خبرنامه گیمرها
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
        تخفیف‌های لحظه‌ای، موجودی کنسول‌ها و معرفی بازی‌های جدید را زودتر از همه
        دریافت کن.
      </p>
      <div className="mx-auto mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          type="email"
          placeholder="ایمیل خود را وارد کنید"
          className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none ring-indigo-300 transition focus:ring"
        />
        <button className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800">
          عضویت
        </button>
      </div>
    </section>
  );
};

export default Subscribed;
