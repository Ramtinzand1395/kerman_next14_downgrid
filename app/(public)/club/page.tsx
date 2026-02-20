import type { Metadata } from "next";
import Link from "next/link";

const clubBenefits = [
  {
    title: "امتیاز روی هر خرید",
    description:
      "به ازای هر ۱۰۰ هزار تومان خرید، امتیاز دریافت می‌کنید و در خریدهای بعدی هزینه کمتری پرداخت می‌کنید.",
  },
  {
    title: "کد تخفیف مناسبتی",
    description:
      "در مناسبت‌ها، تولد اعضا و کمپین‌های ویژه گیمینگ کدهای تخفیف اختصاصی برای اعضای باشگاه فعال می‌شود.",
  },
  {
    title: "دسترسی زودتر به جشنواره‌ها",
    description:
      "اعضای باشگاه قبل از شروع عمومی، به جشنواره‌ها، باندل‌های محدود و پیشنهادهای لحظه‌ای دسترسی خواهند داشت.",
  },
];

const levels = [
  {
    name: "نقره‌ای",
    condition: "ثبت‌نام اولیه",
    perks: "۵٪ بازگشت اعتبار + اطلاع‌رسانی سریع",
  },
  {
    name: "طلایی",
    condition: "بالای ۱۰ میلیون تومان خرید",
    perks: "۸٪ بازگشت اعتبار + ارسال اولویت‌دار",
  },
  {
    name: "الماس",
    condition: "بالای ۲۵ میلیون تومان خرید",
    perks: "۱۲٪ بازگشت اعتبار + پشتیبانی VIP",
  },
];

const steps = [
  "ساخت حساب کاربری یا ورود به حساب فعلی",
  "تکمیل پروفایل و تایید شماره موبایل",
  "شروع خرید و جمع‌آوری امتیاز باشگاه",
  "استفاده از اعتبار و مزایا در سفارش‌های بعدی",
];

export const metadata: Metadata = {
  title: "باشگاه مشتریان",
  description:
    "با عضویت در باشگاه مشتریان کرمان آتاری امتیاز بگیرید، اعتبار هدیه دریافت کنید و از تخفیف‌ها و پیشنهادهای اختصاصی بهره‌مند شوید.",
  alternates: {
    canonical: "/club",
  },
};

export default function ClubPage() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <header className="rounded-3xl bg-gradient-to-l from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white md:p-10">
        <span className="inline-flex rounded-full bg-white/20 px-4 py-1 text-xs font-semibold">
          Kerman Atari Loyalty Club
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
          باشگاه مشتریان کرمان آتاری
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-blue-50 md:text-base">
          با هر خرید، امتیاز جمع کنید و آن را به اعتبار قابل استفاده تبدیل کنید.
          این باشگاه برای مشتریان وفادار طراحی شده تا خرید بعدی، سریع‌تر،
          اقتصادی‌تر و لذت‌بخش‌تر باشد.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            عضویت / ورود به باشگاه
          </Link>
          <Link
            href="/products?sort=newest&page=1"
            className="rounded-xl border border-white/50 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            شروع خرید و دریافت امتیاز
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {clubBenefits.map((benefit) => (
          <article
            key={benefit.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-extrabold text-slate-900">
              {benefit.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {benefit.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-3xl bg-slate-900 p-6 text-white md:p-8">
        <h2 className="text-2xl font-black md:text-3xl">سطوح عضویت</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">
          با افزایش میزان خرید، سطح عضویت شما ارتقا پیدا می‌کند و مزایای بیشتری
          فعال می‌شود.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {levels.map((level) => (
            <article
              key={level.name}
              className="rounded-2xl border border-white/20 bg-white/5 p-4"
            >
              <h3 className="text-lg font-bold">{level.name}</h3>
              <p className="mt-3 text-sm text-slate-300">
                <span className="font-semibold text-white">شرط عضویت:</span>{" "}
                {level.condition}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                <span className="font-semibold text-white">مزایا:</span>{" "}
                {level.perks}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h2 className="text-2xl font-black text-slate-900">نحوه شروع</h2>
        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
