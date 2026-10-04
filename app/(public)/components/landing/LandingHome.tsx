import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Dumbbell,
  Gamepad2,
  Gauge,
  Headphones,
  Instagram,
  ListChecks,
  Map,
  MapPin,
  PackageOpen,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Swords,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LandingData } from "@/lib/landing-data";
import type { Product } from "@/types";
import { stripHtmlTags } from "@/helpers/stripHtmlTags";
import ProductImage from "@/app/components/ProductImage";
import Motion from "../Motion";
import Faq from "./Faq";
import LandingCatalog from "./LandingCatalog";

const REQUEST_URL = "/my-profile?step=6";
const INSTAGRAM_URL =
  "https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw==";
const MAP_URL =
  "https://maps.google.com/?q=%DA%A9%D8%B1%D9%85%D8%A7%D9%86%D8%8C%20%D8%AE%DB%8C%D8%A7%D8%A8%D8%A7%D9%86%20%D9%86%D8%A7%D8%B5%D8%B1%DB%8C%D9%87%D8%8C%20%D8%A8%DB%8C%D9%86%20%DA%A9%D9%88%DA%86%D9%87%20%DB%B2%20%D9%88%20%DB%B4%D8%8C%20%D9%86%D8%A8%D8%B4%20%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%D9%85%D8%A7%D8%AF%D8%B1";
const MAP_EMBED_URL =
  "https://www.google.com/maps?q=%DA%A9%D8%B1%D9%85%D8%A7%D9%86%D8%8C%20%D8%AE%DB%8C%D8%A7%D8%A8%D8%A7%D9%86%20%D9%86%D8%A7%D8%B5%D8%B1%DB%8C%D9%87%D8%8C%20%D8%A8%DB%8C%D9%86%20%DA%A9%D9%88%DA%86%D9%87%20%DB%B2%20%D9%88%20%DB%B4%D8%8C%20%D9%86%D8%A8%D8%B4%20%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%D9%85%D8%A7%D8%AF%D8%B1&output=embed";

const quickAccess = [
  {
    title: "نصب بازی PS5",
    description: "انتخاب بازی و ثبت درخواست",
    href: REQUEST_URL,
    icon: Gamepad2,
  },
  {
    title: "خدمات و تعمیرات",
    description: "کنسول و دسته بازی",
    href: "/services",
    icon: Wrench,
  },
  {
    title: "لوازم گیمینگ",
    description: "دسته، کابل، پایه و بیشتر",
    href: "/products?category=gaming-accessories&sort=newest&page=1",
    icon: Headphones,
  },
  {
    title: "درخواست حضوری",
    description: "ثبت سریع و هماهنگی",
    href: REQUEST_URL,
    icon: CalendarDays,
  },
];

const genreIcons = {
  sports: Dumbbell,
  action: Swords,
  adventure: Map,
  "two-player": UsersRound,
  racing: Gauge,
  rpg: BookOpen,
} as const;

const serviceCards = [
  { title: "عیب‌یابی کنسول", icon: Search },
  { title: "تعمیر دسته", icon: Gamepad2 },
  { title: "سرویس و نگهداری", icon: Settings2 },
];

const steps = [
  {
    title: "خدمتت رو انتخاب کن",
    text: "نصب بازی، خرید یا تعمیر",
    icon: ListChecks,
  },
  {
    title: "درخواست ثبت کن",
    text: "جزئیات را برای هماهنگی بفرست",
    icon: CalendarDays,
  },
  {
    title: "بیا کرمان آتاری",
    text: "حضوری تحویل بده و پیگیری کن",
    icon: Store,
  },
];

const benefits = [
  { title: "تخصص کنسول", text: "تجربه و دانش فنی", icon: Gamepad2 },
  { title: "نصب بازی", text: "با انتخاب بازی‌ها", icon: Swords },
  { title: "فروشگاه حضوری", text: "در قلب کرمان", icon: Store },
  { title: "آرشیو متنوع", text: "انتخاب‌های بیشتر", icon: BookOpen },
  { title: "راهنمایی انتخاب", text: "مشاوره متناسب", icon: MapPin },
];

const consoleGuides = [
  {
    title: "PS5",
    text: "تجربه نسل جدید",
    href: "/products?category=consoles&tag=ps5&sort=newest&page=1",
    icon: Sparkles,
  },
  {
    title: "PS4",
    text: "انتخاب اقتصادی",
    href: "/products?category=consoles&tag=ps4&sort=newest&page=1",
    icon: Gamepad2,
  },
  {
    title: "Xbox",
    text: "آشنایی با Xbox",
    href: "/products?category=consoles&tag=xbox&sort=newest&page=1",
    icon: PackageOpen,
  },
];

function conditionLabel(product: Product) {
  const slugs = new Set((product.tags || []).map((tag) => tag.slug));
  if (slugs.has("new")) return "نو";
  if (slugs.has("used")) return "کارکرده";
  return null;
}

export default function LandingHome({ data }: { data: LandingData }) {
  return (
    <div className="overflow-x-clip bg-[#f3f8ff] pb-20 text-[#0b1d48] sm:pb-0">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-3 sm:px-5">
        <Motion direction="down" distance={12} duration={0.4}>
          <section className="relative overflow-hidden rounded-2xl bg-[#063b93] text-white sm:h-[218px]">
            <div className="relative h-[210px] sm:h-full">
              <Image
                src="/PS5 Hero Banner with Game Cases-1.png"
                alt="کنسول PS5، دسته و بازی‌های پلی استیشن"
                fill
                priority
                sizes="(max-width: 639px) 100vw, 1320px"
                className="object-cover object-left"
              />
            </div>
            <div className="bg-[#063b93] p-5 sm:absolute sm:inset-y-0 sm:right-0 sm:flex sm:w-[57%] sm:flex-col sm:justify-center sm:bg-transparent sm:p-3">
              <h1 className="text-3xl font-black leading-[1.35] sm:max-w-[440px] sm:text-[26px] sm:leading-[1.25]">
                دنیای بازی،
                <br />
                همین‌جا در کرمان
              </h1>
              <p className="mt-1 max-w-md text-xs font-medium leading-4 text-blue-50 sm:text-[9px]">
                خرید کنسول، نصب بازی PS4 و PS5 و خدمات تخصصی کنسول با خیال
                راحت و پشتیبانی واقعی.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1 text-[8px] font-bold text-blue-50 sm:flex-nowrap sm:text-[7px]">
                <span className="landing-hero-badge">
                  <ShieldCheck className="h-3.5 w-3.5" /> راهنمای انتخاب بازی
                </span>
                <span className="landing-hero-badge">
                  <Gamepad2 className="h-3.5 w-3.5" /> PS4 · PS5
                </span>
                <span className="landing-hero-badge">
                  <MapPin className="h-3.5 w-3.5" /> خدمات حضوری در کرمان
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5 min-[420px]:flex-row">
                <Link href="/products?sort=newest&page=1" className="landing-primary landing-hero-cta whitespace-nowrap text-[9px]">
                  مشاهده محصولات
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <Link href={REQUEST_URL} className="landing-secondary landing-hero-cta whitespace-nowrap text-[9px]">
                  ثبت درخواست حضوری
                  <CalendarDays className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </Motion>

        <section className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="دسترسی سریع">
          {quickAccess.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="landing-quick-card group">
                <Icon className="h-7 w-7 shrink-0 text-[#1269f4]" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-black sm:text-sm">{item.title}</h2>
                  <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-400 sm:text-[10px]">
                    {item.description}
                  </p>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f5ff] text-[#1269f4]">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </section>

        <Motion distance={12} duration={0.4}>
          <section className="landing-section relative overflow-hidden rounded-2xl bg-[#073c94] text-white sm:h-[142px]">
            <div className="relative h-[170px] sm:h-full">
              <Image
                src="/White PS5 console with controller on blue-2.png"
                alt="کنسول سفید PS5 و دسته روی پس‌زمینه آبی"
                fill
                priority
                sizes="(max-width: 639px) 100vw, 1320px"
                className="object-cover object-right"
              />
            </div>
            <div className="bg-[#073c94] p-5 sm:absolute sm:inset-y-0 sm:left-0 sm:flex sm:w-[51%] sm:flex-col sm:justify-center sm:bg-transparent sm:px-7 sm:py-3">
              <div className="flex items-center gap-2 text-[10px] font-black">
                <span className="rounded-md bg-red-500 px-2 py-1">جدید</span>
                <span>PS5 تا ورژن ۱۳.۶۰</span>
              </div>
              <h2 className="mt-1 text-2xl font-black sm:text-[30px]">بالاخره کپی‌خور شد</h2>
              <p className="mt-0.5 text-[10px] text-blue-50 sm:text-xs">
                در حال تست و آماده‌سازی بازی‌های نسل هشتم.
              </p>
              <Link href={REQUEST_URL} className="mt-2 inline-flex min-h-8 w-fit items-center gap-2 rounded-lg bg-white px-4 text-[10px] font-black text-[#0c51b9]">
                ثبت درخواست
                <CalendarDays className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </Motion>

        <div className="landing-section">
          <LandingCatalog
            title="این روزا چی بازی کنیم؟"
            description="جدیدترین و محبوب‌ترین بازی‌های منتشرشده فروشگاه"
            tabs={data.gameTabs}
            variant="games"
          />
        </div>

        <section className="landing-section landing-panel p-2">
          <div className="mb-1.5">
            <h2 className="text-base font-black sm:text-lg">نمی‌دونی چی بازی کنی؟</h2>
            <p className="text-[9px] text-slate-400 sm:text-[10px]">
              براساس تگ‌های واقعی بازی‌های فروشگاه انتخاب کن
            </p>
          </div>
          {data.genres.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              {data.genres.map((genre) => {
                const Icon =
                  genreIcons[genre.slug as keyof typeof genreIcons] || Gamepad2;
                return (
                  <Link
                    key={genre.slug}
                    href={"/products?category=games&tag=" + genre.slug + "&sort=newest&page=1"}
                    className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-[#e5edf9] bg-white px-2 text-[9px] font-black transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Icon className="h-4 w-4 text-[#1469f5]" />
                    {genre.name}
                    <ChevronLeft className="mr-auto h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-5 text-center text-xs text-slate-500">
              هنوز تگ بازیِ دارای محصول منتشرشده ثبت نشده است.
            </p>
          )}
        </section>

        <div className="landing-section">
          <LandingCatalog
            title="تجهیزات گیمینگت رو کامل کن"
            description="همه لوازم جانبی مورد نیاز کنسول در یکجا"
            tabs={data.equipmentTabs}
            variant="equipment"
          />
        </div>

        <section className="landing-section landing-panel p-2" aria-labelledby="console-heading">
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <div>
              <h2 id="console-heading" className="text-base font-black sm:text-lg">
                کنسول بعدیت رو انتخاب کن
              </h2>
              <p className="text-[9px] text-slate-400 sm:text-[10px]">
                کنسول‌های نو و کارکرده منتشرشده فروشگاه
              </p>
            </div>
            <Link href="/products?category=consoles&sort=newest&page=1" className="inline-flex items-center gap-1 text-[10px] font-black text-[#1469f5]">
              همه کنسول‌ها <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.consoles.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.consoles.map((product) => {
                const condition = conditionLabel(product);
                return (
                  <article key={product._id} className="rounded-xl border border-[#e2ebfb] bg-white p-2">
                    <Link href={"/product/" + product.slug} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-[#f7f9fd] sm:h-[86px] sm:aspect-auto">
                      <ProductImage
                        src={product.mainImage}
                        alt={product.mainImageAlt || product.title}
                        width={420}
                        height={315}
                        loading="lazy"
                        sizes="(max-width: 639px) 46vw, 24vw"
                        className="h-full w-full object-contain p-1"
                      />
                    </Link>
                    <h3 className="mt-1 line-clamp-1 text-[10px] font-black">{product.title}</h3>
                    {condition && (
                      <span className="mt-1 inline-flex rounded-md bg-[#edf4ff] px-2 py-0.5 text-[9px] font-bold text-[#1469f5]">
                        {condition}
                      </span>
                    )}
                    <Link href={"/product/" + product.slug} className="mt-1 flex min-h-11 items-center justify-center gap-1 rounded-md border border-[#bad2ff] text-[9px] font-black text-[#1262e7] sm:min-h-7">
                      مشاهده کنسول <ChevronLeft className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-5 text-center text-xs text-slate-500">
              در حال حاضر کنسول منتشرشده‌ای در این دسته وجود ندارد.
            </p>
          )}
        </section>

        <section
          className="landing-section landing-panel overflow-hidden sm:grid sm:min-h-[158px] sm:grid-cols-2"
          dir="ltr"
        >
            <div className="relative h-[220px] sm:h-[158px]">
              <Image
                src="/White controller on blue repair bench-3.png"
                alt="دسته پلی استیشن روی میز تعمیرات تخصصی"
                fill
                loading="eager"
                sizes="(max-width: 639px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
            <div className="flex flex-col justify-center p-2.5 text-right" dir="rtl">
              <h2 className="text-lg font-black sm:text-xl">
                کنسول یا دستگاهت مشکل داره؟
              </h2>
              <p className="mt-1 text-[10px] leading-5 text-slate-400 sm:text-xs">
                کنسول‌های تخصصی و دسته‌ات را به کارشناس بسپار
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {serviceCards.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.title}
                      className="flex min-h-11 flex-col items-center justify-center rounded-lg bg-[#f6f9fe] px-1 text-center"
                    >
                      <Icon className="h-4 w-4 text-[#1469f5]" />
                      <span className="mt-1 text-[9px] font-black sm:text-[10px]">
                        {service.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/services"
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1469f5] px-4 text-[9px] font-black text-white sm:min-h-7 sm:w-fit"
              >
                مشاوره تعمیرات
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
        </section>

        <section className="landing-section landing-panel p-2" aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="text-center text-base font-black sm:text-lg">
            فقط ۳ مرحله تا بازی کردن
          </h2>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative flex min-h-12 items-center gap-2 rounded-lg bg-[#f8fbff] px-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#1469f5]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-[10px] font-black">{step.title}</h3>
                    <p className="text-[8px] leading-3 text-slate-400">
                      {step.text}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronLeft className="absolute -left-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[#1469f5] sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-panel p-2" aria-labelledby="delivery-heading">
          <div className="text-center">
            <h2 id="delivery-heading" className="text-base font-black sm:text-lg">
              چطور می‌خوای خدمات بگیری؟
            </h2>
            <p className="text-[9px] text-slate-400">
              روش فعال فعلی را انتخاب کن
            </p>
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            <article className="flex items-center gap-2 rounded-lg border-2 border-[#b8d2ff] bg-white p-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#1469f5]">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black text-[#1469f5]">مراجعه حضوری</h3>
                <p className="text-[8px] leading-3 text-slate-400">
                  درخواستت را ثبت کن تا برای مراجعه با تو هماهنگ کنیم.
                </p>
                <Link
                  href={REQUEST_URL}
                  className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#1469f5] text-[9px] font-black text-white sm:min-h-7"
                >
                  ثبت درخواست
                  <CalendarDays className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
            <article className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-400">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200">
                <Truck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black">ارسال با پیک</h3>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[8px] font-black">
                    به‌زودی
                  </span>
                </div>
                <p className="text-[8px] leading-3">
                  دریافت و بازگرداندن دستگاه هنوز فعال نشده است.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-1 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-200 text-[9px] font-black sm:min-h-7"
                >
                  فعلاً غیرفعال
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section landing-panel p-2" aria-labelledby="benefits-heading">
          <div className="text-center">
            <h2 id="benefits-heading" className="text-base font-black sm:text-lg">
              چرا کرمان آتاری؟
            </h2>
            <p className="text-[10px] text-slate-400">
              تجربه‌ای مطمئن و پاسخ‌گو برای گیمرهای کرمان
            </p>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-[#e5edf9] bg-white px-1.5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#1469f5]" />
                  <div>
                    <h3 className="text-[9px] font-black sm:text-[10px]">{benefit.title}</h3>
                    <p className="text-[7px] text-slate-400 sm:text-[8px]">
                      {benefit.text}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-panel p-2" aria-labelledby="guide-heading">
          <div className="text-center">
            <h2 id="guide-heading" className="text-base font-black sm:text-lg">
              کدوم کنسول برای تو مناسبه؟
            </h2>
            <p className="text-[10px] text-slate-400">
              با راهنمایی تخصصی، انتخابت رو دقیق‌تر کن
            </p>
          </div>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
            {consoleGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <article
                  key={guide.title}
                  className="flex min-h-14 items-center gap-2 rounded-lg border border-[#e5edf9] bg-white p-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f5ff] text-[#1469f5]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[10px] font-black">{guide.title}</h3>
                    <p className="text-[8px] text-slate-400">{guide.text}</p>
                  </div>
                  <Link
                    href={guide.href}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-[#bad2ff] px-1.5 text-[8px] font-black text-[#1469f5] sm:min-h-7"
                  >
                    راهنمای خرید
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <Faq />

        <section className="landing-section landing-panel p-2" aria-labelledby="articles-heading">
          <div className="mb-2 text-center">
            <h2 id="articles-heading" className="text-base font-black sm:text-lg">
              از دنیای بازی بیشتر بخون
            </h2>
            <p className="text-[10px] text-slate-400">
              مطالب منتشرشده و خبرهای کرمان آتاری
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-24 flex-col justify-between rounded-lg bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-400 p-2.5 text-white"
            >
              <Instagram className="h-6 w-6" />
              <div>
                <h3 className="text-xs font-black">ما را در اینستاگرام دنبال کنید</h3>
                <span className="mt-2 inline-flex min-h-7 items-center gap-1 rounded-lg bg-white px-3 text-[9px] font-black text-rose-600">
                  مشاهده صفحه <ArrowLeft className="h-3 w-3" />
                </span>
              </div>
            </a>
            {data.articles.map((article) => (
              <article
                key={article._id}
                className="group overflow-hidden rounded-xl border border-[#e5edf9] bg-white"
              >
                <Link href={"/blog/" + article.slug} className="relative block h-[52px] overflow-hidden bg-slate-100">
                  <Image
                    src={article.coverImage || "/atari-seeklogo.svg"}
                    alt={article.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 639px) 100vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-1.5">
                  <h3 className="line-clamp-2 min-h-6 text-[9px] font-black leading-3 sm:text-[10px]">
                    {article.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-[8px] text-slate-400 sm:hidden">
                    {stripHtmlTags(
                      article.metaDescription || article.excerpt || article.content,
                    )}
                  </p>
                  <Link
                    href={"/blog/" + article.slug}
                    className="mt-1 inline-flex items-center gap-1 text-[9px] font-black text-[#1469f5]"
                  >
                    مطالعه مقاله <ChevronLeft className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            ))}
            {data.articles.length === 0 && (
              <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-center text-xs text-slate-500 sm:col-span-3">
                هنوز مقالهٔ منتشرشده‌ای وجود ندارد.
              </div>
            )}
          </div>
        </section>

        <section
          className="landing-section landing-panel overflow-hidden sm:grid sm:min-h-[126px] sm:grid-cols-[1.15fr_0.85fr]"
          dir="ltr"
          aria-labelledby="visit-heading"
        >
          <iframe
            title="نقشه فروشگاه کرمان آتاری"
            src={MAP_EMBED_URL}
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-[210px] w-full border-0 sm:min-h-full"
          />
          <div className="flex flex-col justify-center p-2.5 text-right" dir="rtl">
            <h2 id="visit-heading" className="text-base font-black sm:text-lg">
              حضوری منتظرتیم
            </h2>
            <p className="mt-1 text-[9px] font-bold leading-4 text-slate-600">
              کرمان، خیابان ناصریه، بین کوچه ۲ و ۴، نبش داروخانه مادر
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-[#1469f5]" /> صبح ۹ تا ۱۲
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-[#1469f5]" /> عصر ۴ تا ۸
              </span>
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <Link href={REQUEST_URL} className="landing-primary min-h-8 flex-1 text-[9px]">
                ثبت درخواست حضوری
              </Link>
              <a
                href={MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-secondary min-h-8 flex-1 text-[9px]"
              >
                مسیریابی <Send className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <nav
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-md grid-cols-4 rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-2xl backdrop-blur sm:hidden"
          aria-label="دسترسی سریع موبایل"
        >
          {[
            { label: "محصولات", href: "/products?sort=newest&page=1", icon: PackageOpen },
            { label: "بازی‌ها", href: "/products?category=games&sort=newest&page=1", icon: Gamepad2 },
            { label: "درخواست", href: REQUEST_URL, icon: CalendarDays },
            { label: "خدمات", href: "/services", icon: Wrench },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-black text-slate-500"
              >
                <Icon className="h-5 w-5 text-[#1469f5]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
