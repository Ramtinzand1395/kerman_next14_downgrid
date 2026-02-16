import Image from "next/image";
import { Metadata } from "next";

// ✅ متا دیتا برای سئو (اگر این فایل داخل app/.../page.tsx است)
export const metadata: Metadata = {
  title: "درباره ما | کرمان آتاری",
  description:
    "کرمان آتاری از سال ۱۳۴۰ در زمینه خرید و فروش بازی‌های پلی‌استیشن و کنسول‌های سونی فعالیت می‌کند. کیفیت، قیمت مناسب و رضایت مشتریان اولویت ماست.",
  keywords: [
    "کرمان آتاری",
    "درباره کرمان آتاری",
    "بازی پلی استیشن در کرمان",
    "دستگاه PS5",
    "کنسول پلی استیشن",
  ],
  openGraph: {
    title: "درباره ما | کرمان آتاری",
    description:
      "خرید و فروش بازی‌ها و کنسول‌های پلی‌استیشن در کرمان با قیمت مناسب و گارانتی معتبر از سال ۱۳۴۰",
    images: ["/banner_1.webp"],
    type: "website",
  },
};

const Page = () => {
  return (
    <article className="container mx-auto px-5 py-16 text-right">

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "درباره ما - کرمان آتاری",
            description:
              "کرمان آتاری از سال ۱۳۴۰ ارائه‌دهنده بازی‌ها و کنسول‌های پلی‌استیشن با بهترین قیمت و گارانتی در کرمان است.",
            publisher: {
              "@type": "Organization",
              name: "کرمان آتاری",
              url: "https://your-domain.com",
              logo: "https://your-domain.com/logo.png",
            },
            mainEntity: {
              "@type": "Organization",
              name: "کرمان آتاری",
              foundingDate: "1961",
              description:
                "خرید و فروش بازی و کنسول پلی‌استیشن با قیمت مناسب و خدمات سریع.",
            },
          }),
        }}
      />

      <header className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* متن درباره ما */}
        <section className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            درباره ما
          </h1>

          <p className="text-gray-600 leading-8 text-justify">
            ما در <span className="font-semibold text-blue-600">کرمان آتاری</span>،
            از سال ۱۳۴۰ فعالیت خود را در زمینه خرید و فروش بازی‌ها و کنسول‌های
            پلی‌استیشن آغاز کرده‌ایم. هدف ما ارائه محصولات با کیفیت، قیمت مناسب و
            رضایت کامل مشتریان است.
          </p>

          <p className="text-gray-600 leading-8 text-justify">
            ما به نوآوری و خدمات سریع اعتقاد داریم. تیم ما همیشه در تلاش است تا
            جدیدترین بازی‌ها و کنسول‌ها را با گارانتی و پشتیبانی عالی در اختیار
            مشتریان قرار دهد.
          </p>

          <p className="text-gray-600 leading-8 font-semibold">
            رضایت شما افتخار ماست ❤️
          </p>
        </section>

        {/* تصویر */}
        <div className="relative w-full aspect-square md:aspect-video rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/about.jpg"
            alt="درباره کرمان آتاری - خرید و فروش بازی و کنسول پلی‌استیشن"
            fill
            priority
            className="object-cover"
          />
        </div>

      </header>
    </article>
  );
};

export default Page;
