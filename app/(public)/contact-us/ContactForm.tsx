"use client";

import React, { useState } from "react";
import { Clock3, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { toast } from "react-toastify";

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const contactChannels = [
  {
    icon: Phone,
    title: "تماس تلفنی",
    value: "۰۹۳۸۳۰۷۷۲۲۵",
    href: "tel:+989383077225",
    description: "برای سفارش فوری یا پیگیری خرید، همه‌روزه پاسخ‌گو هستیم.",
  },
  {
    icon: Mail,
    title: "ایمیل",
    value: "info@kermanatari.ir",
    href: "mailto:info@kermanatari.ir",
    description: "برای همکاری، پیشنهاد قیمت عمده و پشتیبانی فنی پیام بگذارید.",
  },
  {
    icon: MapPin,
    title: "آدرس فروشگاه",
    value: " کرمان - خیابان باهنر (ناصریه) - بین کوچه 2 و 4 - جنب داروخانه مادر",
    href: "https://maps.google.com/?q=Kerman",
    description: "مراجعه حضوری برای تحویل سریع و دریافت مشاوره تخصصی.",
  },
  {
    icon: Clock3,
    title: "ساعات پاسخ‌گویی",
    value: "شنبه تا پنجشنبه | ۱۰ تا ۲۲",
    href: "#",
    description: "پیام‌های خارج از ساعات کاری در اولین فرصت بررسی می‌شوند.",
  },
];

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const res = await fetch("/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "ارسال پیام ناموفق بود.");
      }

      toast.success("پیام شما ثبت شد .");
      setFormData(initialFormData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در ارسال پیام";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10"
      >
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">
            ارسال پیام به تیم کرمان آتاری
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            برای مشاوره خرید بازی و کنسول، استعلام موجودی، پیگیری سفارش یا
            دریافت پشتیبانی فنی، فرم زیر را تکمیل کنید.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              نام و نام خانوادگی
            </label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="مثلاً: علی محمدی"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-slate-700"
            >
              شماره تماس
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="مثلاً: you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="subject"
              className="text-sm font-medium text-slate-700"
            >
              موضوع پیام
            </label>
            <input
              id="subject"
              type="text"
              name="subject"
              placeholder="مثلاً: مشاوره خرید PS5"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label
            htmlFor="message"
            className="text-sm font-medium text-slate-700"
          >
            متن پیام
          </label>
          <textarea
            id="message"
            name="message"
            placeholder="جزئیات درخواست خود را بنویسید..."
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <MessageSquare size={18} />
          {submitting ? "در حال ثبت پیام..." : "ارسال پیام"}
        </button>
      </form>

      <aside className="space-y-4">
        {contactChannels.map((channel) => {
          const Icon = channel.icon;

          const CardContent = (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {channel.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {channel.value}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {channel.description}
              </p>
            </div>
          );

          if (channel.href === "#") {
            return <div key={channel.title}>{CardContent}</div>;
          }

          return (
            <a
              key={channel.title}
              href={channel.href}
              target="_blank"
              rel="noreferrer"
            >
              {CardContent}
            </a>
          );
        })}
      </aside>
    </section>
  );
}
