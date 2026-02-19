import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://kermanatari.ir";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "خدمات کرمان آتاری | پشتیبانی و مشاوره خرید",
  description:
    "با خدمات کامل کرمان آتاری آشنا شوید؛ از بازی‌های اکانتی و مشاوره خرید تا ارسال سریع و پشتیبانی بعد از خرید در کرمان و سراسر کشور.",
  alternates: {
    canonical: "/services",
  },
};

const services = [
  {
    title: "بازی‌های اکانتی",
    summary:
      "جدیدترین بازی‌های اکانتی پلی‌استیشن با دسترسی مطمئن و راهنمای کامل فعال‌سازی ارائه می‌شود.",
    benefits: [
      "تحویل سریع اطلاعات اکانت بعد از ثبت سفارش",
      "راهنمای قدم‌به‌قدم نصب و فعال‌سازی",
      "پیشنهاد بازی متناسب با سبک و بودجه شما",
    ],
    cta: "مشاهده بازی‌های اکانتی",
  },
  {
    title: "مشاوره خرید",
    summary:
      "قبل از هر خرید، با بررسی دقیق نیاز شما بهترین گزینه را برای یک انتخاب هوشمندانه معرفی می‌کنیم.",
    benefits: [
      "راهنمایی بر اساس بودجه و نوع استفاده",
      "مقایسه شفاف مدل‌ها و لوازم جانبی",
      "پاسخ‌گویی صادقانه و بدون پیشنهاد اضافی",
    ],
    cta: "دریافت مشاوره خرید",
  },
  {
    title: "خرید و فروش کنسول کارکرده",
    summary:
      "کنسول کارکرده شما با بررسی تخصصی قیمت‌گذاری می‌شود و گزینه‌های تست‌شده برای خرید هم در دسترس است.",
    benefits: [
      "ارزیابی فنی دقیق قبل از خرید یا فروش",
      "قیمت‌گذاری منصفانه مطابق بازار روز",
      "اطمینان از سلامت دستگاه و لوازم همراه",
    ],
    cta: "ثبت درخواست کنسول کارکرده",
  },
  {
    title: "ارسال سریع در کرمان/کشور",
    summary:
      "سفارش‌ها در کوتاه‌ترین زمان ممکن در کرمان ارسال شده و برای سراسر کشور با بسته‌بندی امن تحویل می‌گردد.",
    benefits: [
      "ارسال فوری برای سفارش‌های شهر کرمان",
      "بسته‌بندی ایمن برای جلوگیری از آسیب",
      "امکان پیگیری وضعیت مرسوله تا تحویل",
    ],
    cta: "بررسی شرایط ارسال",
  },
  {
    title: "پشتیبانی بعد از خرید",
    summary:
      "پس از خرید هم کنار شما می‌مانیم تا هر سوال یا مشکل احتمالی سریع و دقیق پیگیری شود.",
    benefits: [
      "پاسخ‌گویی سریع از کانال‌های ارتباطی",
      "راهنمایی فنی برای راه‌اندازی و استفاده",
      "پیگیری مسئولانه تا حل کامل مسئله",
    ],
    cta: "ارتباط با پشتیبانی",
  },
];

const orderSteps = [
  {
    title: "انتخاب خدمت یا محصول",
    description:
      "خدمت موردنظرتان را از سایت انتخاب کنید یا برای دریافت راهنمایی اولیه با ما تماس بگیرید.",
  },
  {
    title: "ثبت سفارش و تایید نهایی",
    description:
      "اطلاعات لازم را ثبت کنید تا کارشناسان کرمان آتاری سفارش را بررسی و نهایی‌سازی کنند.",
  },
  {
    title: "تحویل سریع و پشتیبانی",
    description:
      "سفارش طبق روش انتخابی شما تحویل می‌شود و پشتیبانی پس از خرید در کنارتان خواهد بود.",
  },
];

const faqItems = [
  {
    question: "چطور به اصالت خدمات و محصولات کرمان آتاری اعتماد کنم؟",
    answer:
      "تمام خدمات با توضیحات شفاف، شرایط مشخص و پاسخ‌گویی مستقیم ارائه می‌شود تا قبل از پرداخت، دید کامل و مطمئن داشته باشید.",
  },
  {
    question: "سفارش‌ها در کرمان چه مدت زمانه به دستم می‌رسد؟",
    answer:
      "ارسال داخل کرمان در سریع‌ترین بازه ممکن انجام می‌شود و زمان دقیق هنگام ثبت سفارش به شما اعلام خواهد شد.",
  },
  {
    question: "برای ارسال به سایر شهرها چه روشی استفاده می‌شود؟",
    answer:
      "سفارش‌های خارج از کرمان با روش‌های مطمئن پستی و بسته‌بندی ایمن ارسال می‌شوند تا سالم به دست شما برسند.",
  },
  {
    question: "آیا بازی‌های اکانتی ضمانت دارند؟",
    answer:
      "بله، اطلاعات و شرایط استفاده بازی‌های اکانتی شفاف اعلام می‌شود و در صورت بروز مشکل، پشتیبانی همراه شماست.",
  },
  {
    question: "شرایط خرید و فروش کنسول کارکرده چیست؟",
    answer:
      "کنسول‌ها قبل از معامله بررسی فنی می‌شوند و قیمت‌گذاری بر اساس سلامت دستگاه، لوازم همراه و وضعیت بازار انجام می‌شود.",
  },
  {
    question: "اگر در انتخاب محصول مردد باشم چه کاری انجام دهم؟",
    answer:
      "کافی است با تیم مشاوره تماس بگیرید تا متناسب با بودجه، سبک بازی و نیازتان بهترین گزینه پیشنهاد شود.",
  },
  {
    question: "پشتیبانی بعد از خرید شامل چه مواردی است؟",
    answer:
      "راهنمایی برای راه‌اندازی، پاسخ به سوالات فنی و پیگیری مشکلات احتمالی تا رسیدن به نتیجه نهایی، بخشی از خدمات ماست.",
  },
  {
    question: "آیا قبل از ثبت سفارش می‌توانم شرایط را کامل بدانم؟",
    answer:
      "بله، جزئیات قیمت، شیوه تحویل، ضمانت و شرایط هر خدمت پیش از ثبت نهایی سفارش به‌صورت کامل اعلام می‌شود.",
  },
];

const articleSections = [
  {
    heading: "چرا صفحه خدمات برای سئو مهم است؟",
    content:
      "بخش خدمات یکی از صفحات کلیدی برای جذب کاربر از جستجوهای محلی و هدفمند است. وقتی کاربر عباراتی مثل «نصب بازی PS5 در کرمان» یا «تعمیر پلی‌استیشن» را جستجو می‌کند، این صفحه می‌تواند دقیقاً پاسخ نیاز او باشد و نرخ تبدیل را نسبت به صفحات عمومی بالاتر ببرد.",
  },
  {
    heading: "چه خدماتی بیشتر جستجو می‌شوند؟",
    content:
      "کاربران معمولاً به دنبال نصب بازی، خرید اکانت قانونی، سرویس کنسول، رفع مشکل کندی یا داغی دستگاه، و مشاوره خرید تجهیزات هستند. اگر این خدمات با توضیحات شفاف، مزایا، مدت زمان انجام و شرایط پشتیبانی ارائه شوند، هم اعتماد کاربر بیشتر می‌شود و هم موتور جستجو بهتر موضوع صفحه را درک می‌کند.",
  },
  {
    heading: "چطور محتوای خدمات را به لید واقعی تبدیل کنیم؟",
    content:
      "در هر بخش خدمات، یک فراخوان اقدام واضح قرار دهید؛ مثل «دریافت مشاوره رایگان» یا «ثبت درخواست سرویس». همچنین اضافه‌کردن سوالات متداول، نظرات مشتریان و نشانه‌های اعتماد (مثل ضمانت یا پشتیبانی) باعث می‌شود کاربر سریع‌تر تصمیم بگیرد و نرخ خروج صفحه کاهش پیدا کند.",
  },
];
export default function ServicesPage() {
  return (
    <main className="container mx-auto space-y-10 px-4 py-12 md:py-16" dir="rtl">
      <section className="space-y-4 rounded-3xl bg-gradient-to-l from-blue-900 to-blue-800 p-6 text-white md:p-10">
        <h1 className="text-3xl font-black md:text-5xl">خدمات کرمان آتاری</h1>
        <p className="max-w-4xl text-sm leading-8 text-slate-100 md:text-base">
          در کرمان آتاری تلاش می‌کنیم تجربه‌ای مطمئن و حرفه‌ای برای خرید شما
          بسازیم؛ از ارائه محصولات و خدمات اصیل تا ارسال سریع در کرمان و سراسر
          کشور. تیم ما با پشتیبانی پاسخ‌گو و مشاوره خرید دقیق، کنار شماست تا با
          خیال راحت انتخاب کنید. هدف ما این است که هر سفارش، به یک تجربه رضایت‌بخش
          و قابل اعتماد تبدیل شود.
        </p>
      </section>

      <section aria-label="خدمات کرمان آتاری" className="space-y-5">
        <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
          سرویس‌های اصلی ما
        </h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {service.summary}
              </p>
              <ul className="mt-4 list-disc space-y-2 pr-5 text-sm text-slate-700">
                {service.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
              <a
                href="/contact-us"
                className="mt-5 inline-flex w-fit rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {service.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-50 p-6 md:p-8">
        <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
          چطور سفارش ثبت کنم؟
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {orderSteps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-sm font-bold text-blue-700">مرحله {index + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
          سوالات پرتکرار
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h3 className="text-base font-bold leading-7 text-slate-900">
                {item.question}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
  <section className="mt-12 rounded-2xl bg-slate-50 p-6 md:p-8">
        <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
          مقاله پیشنهادی برای سئوی بهتر صفحه خدمات
        </h2>
        <p className="mt-3 text-sm leading-8 text-slate-700 md:text-base">
          اگر هدفتان رشد ورودی ارگانیک است، این ساختار مقاله می‌تواند به‌عنوان
          محتوای پایه صفحه خدمات استفاده شود و به مرور با نمونه‌کار، سوالات
          متداول و کلمات کلیدی محلی تکمیل گردد.
        </p>

        <div className="mt-6 space-y-6">
          {articleSections.map((section) => (
            <section key={section.heading} className="rounded-xl bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">{section.heading}</h3>
              <p className="mt-2 text-sm leading-8 text-slate-600 md:text-base">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/40 p-6">
        <h2 className="text-xl font-extrabold text-slate-900">
          مزیت انتخاب خدمات کرمان آتاری
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-700 md:text-base">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
            توضیح شفاف خدمات قبل از ثبت سفارش
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
            پشتیبانی پاسخ‌گو قبل و بعد از خرید
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
            تمرکز بر نیاز واقعی کاربر، نه صرفاً فروش محصول
          </li>
        </ul>

        <div className="mt-6">
          <Link
            href="/contact-us"
            className="inline-flex rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            دریافت مشاوره خدمات
          </Link>
        </div>
      </section>
      <section className="rounded-2xl bg-blue-700 p-6 text-white md:p-8">
        <p className="text-base font-semibold leading-8 md:text-lg">
          برای دریافت بهترین پیشنهاد خرید، همین حالا با کرمان آتاری تماس بگیرید؛
          ما کنار شما هستیم تا سریع، مطمئن و با خیال راحت سفارش‌تان را ثبت کنید.
          <br />
          شماره تماس: <span className="font-black">۰۳۴-XXXXXXXX</span>
        </p>
      </section>
    </main>
  );
}
