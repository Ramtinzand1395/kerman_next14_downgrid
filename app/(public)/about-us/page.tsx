import Image from "next/image";
import Link from "@/app/components/navigation/NavigationFeedback";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

const description =
  "کرمان آتاری با بیش از ۴۰ سال سابقه در کرمان؛ فروش کنسول و لوازم جانبی، نصب بازی PS4 و PS5 و عرضه تابلو گیمینگ. آدرس فروشگاه، خدمات و راه‌های ارتباطی.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "درباره کرمان آتاری؛ فروشگاه و خدمات گیمینگ در کرمان",
  description,
  keywords: [
    "درباره ما کرمان آتاری",
    "خرید پلی استیشن در کرمان",
    "فروش بازی ps5",
    "خرید کنسول",
    "فروش لوازم جانبی پلی استیشن",
  ],
  alternates: {
    canonical: "/about-us",
  },
  openGraph: {
    title: "درباره ما | کرمان آتاری",
    description,
    type: "website",
    url: `${SITE_URL}/about-us`,
    siteName: "کرمان آتاری",
    locale: "fa_IR",
    images: [
      {
        url: "/about-us.webp",
        width: 1200,
        height: 630,
        alt: "کرمان آتاری - درباره ما",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "درباره ما | کرمان آتاری",
    description,
    images: ["/about-us.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const values = [
  {
    title: "انتخاب کنسول و لوازم جانبی",
    description:
      "کنسول، دسته و لوازم جانبی را با توجه به دستگاه، بودجه و نیازتان مقایسه کنید. مشخصات، وضعیت کالا و گزینه‌های خرید در صفحه هر محصول درج می‌شود.",
  },
  {
    title: "نصب بازی و خدمات دستگاه",
    description:
      "برای نصب بازی PS4 و PS5، انتخاب بازی‌ها و بررسی کنسول یا دسته می‌توانید درخواست ثبت کنید. روش تحویل دستگاه و شرایط هر خدمت هنگام ثبت درخواست مشخص می‌شود.",
  },
  {
    title: "تابلو برای فضای گیمینگ",
    description:
      "طرح‌های بازی‌ها و شخصیت‌های محبوب را به‌صورت شاسی یا قاب‌دار ببینید. تصاویر، اندازه‌ها و قیمت هر گزینه در صفحه همان تابلو قابل بررسی است.",
  },
];

const milestones = [
  "راهنمایی برای انتخاب کنسول، بازی و لوازم سازگار با دستگاه شما",
  "فروش حضوری در کرمان و خرید اینترنتی از kermanatari.ir",
  "ثبت درخواست نصب بازی و انتخاب روش تحویل دستگاه در سایت",
  "پاسخ‌گویی به پرسش‌های خرید و پیگیری سفارش از راه‌های ارتباطی فروشگاه",
];

export default function AboutUsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "کرمان آتاری",
        url: SITE_URL,
        logo: `${SITE_URL}/atari-seeklogo.svg`,
       sameAs: ["https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw=="],
        description,
      },
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about-us#webpage`,
        name: "درباره ما | کرمان آتاری",
        url: `${SITE_URL}/about-us`,
        inLanguage: "fa-IR",
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "خانه",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "درباره ما",
            item: `${SITE_URL}/about-us`,
          },
        ],
      },
    ],
  };

  return (
    <article className="container mx-auto px-4 py-12 md:py-16" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="grid gap-8 rounded-3xl bg-gradient-to-l from-blue-900 to-blue-800 p-6 text-white md:grid-cols-2 md:p-10">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs">
            همراه گیمرها، از انتخاب تا بازی
          </p>

          <h1 className="text-3xl font-black leading-tight md:text-5xl">
            درباره کرمان آتاری
          </h1>

          <p className="text-sm leading-8 text-slate-200 md:text-base">
            کرمان آتاری فروشگاه و مرکز خدمات بازی در کرمان است. با بیش از ۴۰ سال
            سابقه در ارائه خدمات و نصب بازی، از راهنمایی در انتخاب کنسول و لوازم
            جانبی تا راه‌اندازی و پشتیبانی کنار شما هستیم. فروشگاه حضوری ما در
            خیابان باهنر، ناصریه، قرار دارد و محصولات و خدمات مجموعه از طریق
            همین سایت نیز قابل بررسی‌اند.
          </p>

          <div className="flex flex-wrap gap-3 text-xs md:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">
              مشاوره تخصصی
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">ارسال براساس مقصد</span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              پشتیبانی پاسخ‌گو
            </span>
          </div>
        </div>

        <div className="relative min-h-64 overflow-hidden rounded-2xl">
          <Image
            src="/about-us.webp"
            alt="تصویر معرفی فروشگاه کرمان آتاری"
            fill
            priority
            className="object-cover"
          />
        </div>
      </header>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {values.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-3 text-lg font-bold text-slate-800">
              {item.title}
            </h2>
            <p className="text-sm leading-7 text-slate-600">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-6">
          <h2 className="mb-4 text-2xl font-extrabold text-slate-900">
            از انتخاب تا پیگیری سفارش
          </h2>

          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            {milestones.map((item, idx) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-2xl font-extrabold text-slate-900">
            چرا کاربران ما را انتخاب می‌کنند؟
          </h2>

          <p className="text-sm leading-8 text-slate-600">
            برای انتخاب بین مدل‌های کنسول، سازگاری لوازم جانبی یا روش نصب بازی،
            می‌توانید پیش از سفارش از ما راهنمایی بگیرید. مشتریان کرمان امکان
            مراجعه حضوری دارند و شرایط دریافت و ارسال دستگاه برای خدمات نصب
            بازی در سایت مشخص می‌شود. برای خرید اینترنتی نیز قیمت، موجودی و
            شرایط ارسال را پیش از پرداخت بررسی کنید.
          </p>

          <p className="mt-5 text-sm font-semibold text-blue-700">
            رضایت شما، اعتبار برند ماست.
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">
          فروشگاه کرمان آتاری کجاست؟
        </h2>
        <address className="mt-4 text-sm not-italic leading-8 text-slate-700">
          کرمان، خیابان باهنر (ناصریه)، بین کوچه ۲ و ۴، جنب داروخانه مادر
        </address>
        <p className="mt-2 text-sm leading-8 text-slate-600">
          برای هماهنگی مراجعه، مشاوره خرید و پیگیری خدمات، از صفحه تماس با ما
          استفاده کنید. شرایط ارسال و بازگشت کالا نیز در قوانین فروشگاه آمده است.
        </p>
        <nav aria-label="آشنایی با محصولات و خدمات کرمان آتاری" className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-blue-700">
          <Link href="/contact-us">تماس و مسیر فروشگاه</Link>
          <Link href="/category/consoles">کنسول‌های بازی</Link>
          <Link href="/services">خدمات و نصب بازی</Link>
          <Link href="/category/gaming-wall-art">تابلو گیمینگ</Link>
          <Link href="/terms">شرایط خرید و ارسال</Link>
        </nav>
      </section>
    </article>
  );
}
