import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Home,
  Info,
  Instagram,
  MapPin,
  Phone,
  ShoppingBag,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
// todo
// باید تکمیل بشه
// نماد اعتماد بیاد
// گذینه ها اضافه بشه مثل اخرین محصولات و مقالات
const quickLinks = [
  { name: "خانه", href: "/", icon: Home },
  { name: "فروشگاه", href: "/products", icon: ShoppingBag },
  { name: "درباره ما", href: "/about-us", icon: Info },
  { name: "تماس با ما", href: "/contact-us", icon: Phone },
];

const features = [
  { title: "ارسال سریع", desc: "ارسال همان‌روز در کرمان", icon: Truck },
  {
    title: "ضمانت اصالت",
    desc: "محصولات اورجینال و تست‌شده",
    icon: ShieldCheck,
  },
  {
    title: "پشتیبانی واقعی",
    desc: "پاسخ‌گویی قبل و بعد خرید",
    icon: BadgeCheck,
  },
];

export default function Footer() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Kerman Atari",
    address: "کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه",
    telephone: "09383077225",
    image: "/atari-seeklogo.svg",
    url: "https://kermanatari.ir",
  };
// from-[#001A6E]  to-[#377dff]
  return (
    <footer
      className="mt-14 overflow-hidden rounded-t-[100px] border-t border-[#001A6E] bg-gradient-to-b from-white via-red-50/40 to-white text-gray-700"
      role="contentinfo"
      aria-label="پاورقی سایت"
    >
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-8">
        {/* Top CTA */}
        <div className="relative mb-10 rounded-2xl border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-lg font-black text-gray-900 md:text-2xl">
                کرمان آتاری؛ مقصد حرفه‌ای گیمرها
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
                از جدیدترین بازی‌های PS5 تا لوازم جانبی گیمینگ را با قیمت مناسب،
                تضمین اصالت و پشتیبانی سریع تهیه کنید.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#001A6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#000d38]"
                >
                  مشاهده محصولات
                  <ArrowLeft className="h-4 w-4" />
                </Link>

                <Link
                  href="/contact-us"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#377dff] px-4 py-2.5 text-sm font-semibold text-[#001A6E] transition hover:text-[#377dff]"
                >
                  مشاوره قبل خرید
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#b7c8ff] text-[#001A6E]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Columns */}
        <div className="mt-10 grid gap-8 border-t border-gray-200 pt-8 md:grid-cols-3">
          {/* Brand */}
          <section aria-label="معرفی">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <Image
                width={42}
                height={42}
                alt="لوگوی کرمان آتاری"
                src="/atari-seeklogo.svg"
              />
              <span className="text-lg font-extrabold text-gray-900">
                Kerman Atari
              </span>
            </Link>

            <p className="text-sm leading-7 text-gray-600">
              خرید و فروش بازی‌های پلی‌استیشن، کنسول و اکانت‌های دیجیتالی با
              قیمت رقابتی و ارسال سریع.
            </p>
          </section>

          {/* Quick links */}
          <section aria-label="دسترسی سریع">
            <h3 className="mb-3 font-extrabold text-gray-900">دسترسی سریع</h3>
            <ul className="space-y-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-red-600"
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Contact */}
          <section
            aria-label="اطلاعات تماس"
            className="space-y-3 text-sm text-gray-600"
          >
            <h3 className="font-extrabold text-gray-900">ارتباط با ما</h3>

            <p className="flex items-start gap-2 leading-7">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#001A6E]" />
              کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه
            </p>

            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#001A6E]" />
              <a href="tel:09383077225" className="hover:text-red-600">
                09383077225
              </a>
            </p>

            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#001A6E]" />
              همه‌روزه از ساعت ۱۰ تا ۲۲
            </p>

            <a
              href="https://instagram.com"
              className="inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="h-4 w-4" />
              دنبال‌کردن در اینستاگرام
            </a>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-500 md:text-sm">
          © 2025 KermanAtari. تمامی حقوق برای این مجموعه محفوظ است.
        </div>
      </div>
    </footer>
  );
}
