import {
  Clock3,
  FileText,
  Instagram,
  MapPin,
  Phone,
  Send,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const INSTAGRAM_URL =
  "https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw==";

const footerLinks = [
  { name: "محصولات", href: "/products", icon: ShoppingBag },
  { name: "خدمات", href: "/services", icon: Wrench },
  { name: "وبلاگ", href: "/blog", icon: FileText },
  { name: "تلگرام", href: "https://t.me/kermanatari", icon: Send, external: true },
];

export default function Footer() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Kerman Atari",
    address:
      "کرمان، خیابان ناصریه، بین کوچه ۲ و ۴، نبش داروخانه مادر",
    telephone: ["09383077225", "09044754897"],
    image: "/atari-seeklogo.svg",
    url: "https://kermanatari.ir",
  };

  return (
    <footer
      className="border-t border-[#dce8f8] bg-white text-[#0b1d48]"
      role="contentinfo"
      aria-label="پاورقی سایت"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto grid max-w-[1320px] gap-2 px-4 py-1.5 sm:grid-cols-[1.2fr_0.8fr_1fr_1fr] sm:px-6">
        <section aria-label="معرفی کرمان آتاری">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              width={28}
              height={28}
              alt="لوگوی کرمان آتاری"
              src="/atari-seeklogo.svg"
              className="h-7 w-7 shrink-0"
            />
            <span className="text-sm font-black">Kerman Atari</span>
          </Link>
          <p className="mt-1 max-w-xs text-[8px] leading-3 text-slate-500 sm:line-clamp-2">
            فروشگاه و مرکز خدمات تخصصی کنسول، بازی و لوازم جانبی در کرمان.
          </p>
        </section>

        <section className="text-[9px]" aria-label="دسترسی سریع">
          <h2 className="text-xs font-black">دسترسی سریع</h2>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-1">
            {footerLinks.map((item) => {
              const Icon = item.icon;
              const classes =
                "inline-flex items-center gap-1.5 text-[10px] text-slate-500 transition hover:text-[#1469f5]";
              return (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={classes}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.name}
                    </a>
                  ) : (
                    <Link href={item.href} className={classes}>
                      <Icon className="h-3.5 w-3.5" />
                      {item.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="text-[9px]" aria-label="اطلاعات فروشگاه">
          <h2 className="text-xs font-black">فروشگاه</h2>
          <div className="mt-1 space-y-1 text-[9px] leading-4 text-slate-500">
            <p className="flex items-start gap-1.5 sm:line-clamp-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1469f5]" />
              کرمان، خیابان ناصریه، بین کوچه ۲ و ۴، نبش داروخانه مادر
            </p>
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-[#1469f5]" />
              صبح ۹ تا ۱۲ · عصر ۴ تا ۸
            </p>
          </div>
        </section>

        <section className="text-[9px]" aria-label="ارتباط با ما">
          <h2 className="text-xs font-black">ارتباط با ما</h2>
          <div className="mt-1 space-y-1 text-[9px] text-slate-500">
            <a
              href="tel:09383077225"
              className="flex items-center gap-1.5 hover:text-[#1469f5]"
            >
              <Phone className="h-3.5 w-3.5 text-[#1469f5]" />
              ۰۹۳۸۳۰۷۷۲۲۵
            </a>
            <a
              href="tel:09044754897"
              className="flex items-center gap-1.5 hover:text-[#1469f5]"
            >
              <Phone className="h-3.5 w-3.5 text-[#1469f5]" />
              ۰۹۰۴۴۷۵۴۸۹۷
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#1469f5]"
            >
              <Instagram className="h-3.5 w-3.5 text-[#1469f5]" />
              اینستاگرام کرمان آتاری
            </a>
          </div>
        </section>
      </div>
      <div className="border-t border-slate-100 py-1.5 text-center text-[8px] text-slate-400">
        © ۲۰۲۶ Kerman Atari · تمامی حقوق محفوظ است
      </div>
    </footer>
  );
}
