import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import { STORE_ORGANIZATION_ID, WEBSITE_ID, toAbsoluteUrl } from "@/lib/site";
import { contactTopicSubject } from "@/lib/contact-topics";

const faqItems = [
  {
    question: "چقدر زمان می‌برد تا به پیام من پاسخ داده شود؟",
    answer:
      "در ساعات کاری معمولاً کمتر از ۲ ساعت و حداکثر تا ۲۴ ساعت کاری پاسخ داده می‌شود.",
  },
  {
    question: "آیا امکان خرید حضوری بازی و کنسول وجود دارد؟",
    answer:
      "بله. می‌توانید با هماهنگی قبلی به فروشگاه مراجعه کنید و سفارش خود را حضوری تحویل بگیرید.",
  },
  {
    question: "برای مشاوره انتخاب بازی مناسب چه اطلاعاتی لازم است؟",
    answer:
      "فقط کافی‌ست مدل کنسول، سبک بازی مورد علاقه و بازه بودجه‌تان را اعلام کنید تا پیشنهاد دقیق دریافت کنید.",
  },
];

export const metadata: Metadata = {
  title: "تماس با ما",
  description:
    "ارتباط مستقیم با فروشگاه کرمان آتاری برای مشاوره خرید PS4 و PS5، پیگیری سفارش، پشتیبانی فنی و همکاری تجاری.",
  keywords: [
    "تماس با کرمان آتاری",
    "پشتیبانی خرید بازی پلی استیشن",
    "مشاوره خرید کنسول در کرمان",
    "آدرس فروشگاه کرمان آتاری",
    "شماره تماس کرمان آتاری",
  ],
  alternates: {
    canonical: "/contact-us",
  },
  openGraph: {
    title: "تماس با ما | کرمان آتاری",
    description:
      "برای مشاوره خرید، پیگیری سفارش و دریافت پشتیبانی تخصصی با تیم کرمان آتاری در ارتباط باشید.",
    url: "/contact-us",
    siteName: "کرمان آتاری",
    locale: "fa_IR",
    type: "website",
    images: [
      {
        url: "/about-us.webp",
        width: 1536,
        height: 1024,
        alt: "ارتباط با فروشگاه کرمان آتاری",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "تماس با ما | کرمان آتاری",
    description:
      "ارتباط سریع با پشتیبانی کرمان آتاری برای خرید بازی، کنسول و لوازم جانبی گیمینگ.",
    images: ["/about-us.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactUsPage({
  searchParams,
}: {
  searchParams: { topic?: string | string[] };
}) {
  const initialSubject = contactTopicSubject(searchParams.topic);
  const contactUrl = toAbsoluteUrl("/contact-us");
  const contactPageId = `${contactUrl}#webpage`;
  const contactSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": contactPageId,
        url: contactUrl,
        name: metadata.title,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": STORE_ORGANIZATION_ID },
      },
      {
        "@type": "FAQPage",
        "@id": `${contactUrl}#faq`,
        isPartOf: { "@id": contactPageId },
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <script
        id="contact-page-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactSchema).replace(/</g, "\\u003c"),
        }}
      />
      <header className="mb-10 rounded-3xl bg-gradient-to-l from-blue-50 via-white to-slate-50 p-6 md:p-10">
        <span className="mb-4 inline-flex rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold text-blue-700">
          ارتباط مستقیم با تیم پشتیبانی
        </span>
        <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-5xl">
          صفحه تماس با ما کرمان آتاری
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 md:text-base">
          اگر برای انتخاب بازی PS4 یا PS5، خرید کنسول، بررسی لوازم جانبی گیمینگ
          یا پیگیری سفارش سوالی دارید، اینجا سریع‌ترین راه ارتباط با ماست.
          کارشناسان کرمان آتاری با پاسخ‌گویی دقیق و صمیمانه کنار شما هستند.
        </p>
      </header>

      <ContactForm initialSubject={initialSubject} />

      <section className="mt-12 grid gap-6 rounded-3xl bg-blue-900 p-6 text-white md:grid-cols-3 md:p-8">
        <article>
          <h2 className="text-lg font-bold">مشاوره قبل از خرید</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            با بررسی بودجه، سبک بازی و مدل کنسول شما، بهترین پیشنهاد ممکن را
            ارائه می‌کنیم.
          </p>
        </article>
        <article>
          <h2 className="text-lg font-bold">پشتیبانی بعد از خرید</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            برای فعال‌سازی، نصب، مشکلات اجرایی یا راهنمایی استفاده از محصولات
            همراه شما هستیم.
          </p>
        </article>
        <article>
          <h2 className="text-lg font-bold">همکاری تجاری</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            اگر فروشنده یا مجموعه فعال در حوزه گیم هستید، از طریق فرم تماس
            درخواست همکاری ثبت کنید.
          </p>
        </article>
      </section>

      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 md:p-10">
        <h2 className="text-2xl font-bold text-slate-900">
          سوالات متداول تماس با ما
        </h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="rounded-2xl bg-slate-50 p-4 md:p-5"
            >
              <h3 className="text-base font-bold text-slate-800">
                {item.question}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
