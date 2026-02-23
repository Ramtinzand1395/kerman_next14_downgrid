import Image from "next/image";
import type { Metadata } from "next";

const SITE_URL = "https://kermanatari.ir";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "درباره ما ",
  description:
    "با داستان، ارزش‌ها، مسیر رشد و خدمات کرمان آتاری آشنا شوید؛ مرجع تخصصی خرید بازی، کنسول و لوازم جانبی پلی‌استیشن در کرمان.",
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
    description:
      "کرمان آتاری؛ همراه گیمرها از مشاوره خرید تا پشتیبانی پس از فروش، با تمرکز بر اصالت کالا و تجربه خرید امن.",
    type: "website",
    url: `${SITE_URL}/about-us`,
    siteName: "کرمان آتاری",
    locale: "fa_IR",
    images: [
      {
        url: "/banner_1.webp",
        width: 1200,
        height: 630,
        alt: "کرمان آتاری - درباره ما",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "درباره ما | کرمان آتاری",
    description:
      "آشنایی با تیم، مسیر رشد و تعهدات کرمان آتاری در ارائه بازی و کنسول‌های پلی‌استیشن.",
    images: ["/about-us.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const values = [
  {
    title: "اصالت و شفافیت",
    description:
      "تمام محصولات با توضیحات کامل، وضعیت دقیق و قیمت‌گذاری شفاف ارائه می‌شوند تا با خیال راحت انتخاب کنید.",
  },
  {
    title: "پشتیبانی واقعی",
    description:
      "از پیش از خرید تا بعد از تحویل کنار شما هستیم؛ پاسخ‌گویی سریع و مسئولانه، بخشی از تعهد روزانه ماست.",
  },
  {
    title: "به‌روز و تخصصی",
    description:
      "با رصد بازار بازی و کنسول، همیشه تلاش می‌کنیم جدیدترین عناوین و بهترین پیشنهادها را در دسترس شما قرار دهیم.",
  },
];

const milestones = [
  "شروع فعالیت با تمرکز بر بازی‌های کنسولی",
  "گسترش سبد محصولات به کنسول، دسته و تجهیزات جانبی",
  "راه‌اندازی فروش آنلاین برای ارسال سریع‌تر در سراسر کشور",
  "توسعه خدمات مشاوره خرید بر اساس نیاز هر گیمر",
];

export default function AboutUsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "کرمان آتاری",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
       sameAs: ["https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw=="],
        description:
          "مرجع تخصصی خرید بازی، کنسول و لوازم جانبی پلی‌استیشن با رویکرد مشاوره‌محور و پشتیبانی واقعی.",
      },
      {
        "@type": "AboutPage",
        name: "درباره ما | کرمان آتاری",
        url: `${SITE_URL}/about-us`,
        inLanguage: "fa-IR",
        description:
          "صفحه معرفی برند کرمان آتاری شامل داستان شکل‌گیری، ارزش‌ها، خدمات و مسیر رشد مجموعه.",
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
            کرمان آتاری با هدف ساخت یک تجربه خرید مطمئن برای گیمرهای ایرانی شکل
            گرفت. ما صرفاً فروشنده نیستیم؛ کنار شما هستیم تا بر اساس بودجه، سبک
            بازی و نیاز واقعی‌تان بهترین انتخاب را انجام دهید.
          </p>

          <div className="flex flex-wrap gap-3 text-xs md:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">
              مشاوره تخصصی
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">ارسال سریع</span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              پشتیبانی پاسخ‌گو
            </span>
          </div>
        </div>

        <div className="relative min-h-64 overflow-hidden rounded-2xl">
          <Image
            src="/about-us.webp"
            alt="تیم کرمان آتاری و خدمات فروش بازی و کنسول"
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
            مسیر رشد ما
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
            چون می‌دانند هر سفارش با دقت بررسی می‌شود، اطلاعات کامل محصول ارائه
            می‌گردد و در صورت نیاز، پشتیبانی بدون پاس‌کاری در دسترس است. هدف ما
            این است که هر خرید، شروع یک ارتباط بلندمدت باشد نه پایان یک تراکنش.
          </p>

          <p className="mt-5 text-sm font-semibold text-blue-700">
            رضایت شما، اعتبار برند ماست.
          </p>
        </div>
      </section>
    </article>
  );
}
