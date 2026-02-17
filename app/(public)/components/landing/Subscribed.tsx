"use client";

import { FormEvent, useState } from "react";
import { toast } from "react-toastify";

const Subscribed = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("لطفاً ایمیل خود را وارد کنید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "ثبت عضویت انجام نشد.");
        return;
      }

      toast.success(data.message ?? "عضویت شما با موفقیت ثبت شد.");
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscribe error:", error);
      toast.error("خطا در ارتباط با سرور.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center md:p-8">
      <h2 className="text-2xl font-black text-slate-900">
        عضویت در خبرنامه گیمرها
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
        تخفیف‌های لحظه‌ای، موجودی کنسول‌ها و معرفی بازی‌های جدید را زودتر از همه
        دریافت کن.
      </p>

      <form
        onSubmit={handleSubscribe}
        className="mx-auto mt-5 flex max-w-xl flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ایمیل خود را وارد کنید"
          className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none ring-indigo-300 transition focus:ring"
          dir="ltr"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-blue-900 px-6 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "در حال ثبت..." : "عضویت"}
        </button>
      </form>
    </section>
  );
};

export default Subscribed;
