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
import ServiceOrderSection from "./ServiceOrderSection";

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

const benefits = [
  {
    title: "تخصص واقعی کنسول",
    text: "راهنمایی توسط تیمی که هر روز با کنسول و تجهیزات گیمینگ سروکار دارد.",
    icon: Gamepad2,
  },
  {
    title: "نصب دقیق و مطمئن",
    text: "بازی‌ها متناسب با دستگاه، سلیقه و فضای ذخیره‌سازی شما انتخاب می‌شوند.",
    icon: Swords,
  },
  {
    title: "پاسخ‌گویی حضوری",
    text: "در فروشگاه کرمان کنار شما هستیم؛ قبل از خرید و بعد از دریافت خدمات.",
    icon: Store,
  },
  {
    title: "انتخاب‌های متنوع",
    text: "از بازی‌های روز تا لوازم ضروری، گزینه‌های بیشتری برای مقایسه دارید.",
    icon: BookOpen,
  },
  {
    title: "پیشنهاد متناسب با شما",
    text: "به‌جای یک پیشنهاد عمومی، براساس نیاز و بودجه‌تان راهنمایی می‌شوید.",
    icon: MapPin,
  },
];

const consoleGuides = [
  {
    title: "PS5",
    text: "تجربه نسل جدید",
    href: "/guides/ps5-buying-guide",
    icon: Sparkles,
  },
  {
    title: "PS4",
    text: "انتخاب اقتصادی",
    href: "/guides/ps4-buying-guide",
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
    <div className="overflow-x-clip bg-[#f3f8ff] pb-24 text-[#0b1d48] sm:pb-0">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-4 sm:px-6 lg:px-8">
        <Motion direction="down" distance={12} duration={0.4}>
          <section className="relative overflow-hidden rounded-2xl bg-[#063b93] text-white sm:aspect-[3/1] sm:rounded-[24px]">
            <div className="relative aspect-[3/1] w-full sm:absolute sm:inset-0 sm:h-full sm:aspect-auto">
              <Image
                src="/PS5 Hero Banner with Game Cases-1.png"
                alt="کنسول PS5، دسته و بازی‌های پلی استیشن"
                fill
                priority
                sizes="(max-width: 639px) 100vw, 1320px"
                className="object-cover object-left"
              />
            </div>
            <div className="bg-[#063b93] p-5 sm:absolute sm:inset-y-0 sm:right-0 sm:flex sm:w-[60%] sm:flex-col sm:justify-center sm:bg-transparent sm:p-4 lg:w-[58%] lg:p-10">
              <h1 className="text-3xl font-black leading-[1.35] sm:max-w-[560px] sm:text-[32px] sm:leading-[1.15] lg:text-5xl">
                دنیای بازی،
                <br />
                همین‌جا در کرمان
              </h1>
              <p className="mt-1.5 max-w-xl text-sm font-medium leading-6 text-blue-50 sm:text-xs sm:leading-5 lg:mt-2 lg:text-base lg:leading-6">
                خرید کنسول، نصب بازی PS4 و PS5 و خدمات تخصصی کنسول با خیال
                راحت و پشتیبانی واقعی.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold text-blue-50 sm:flex-nowrap sm:text-[10px] lg:mt-3 lg:gap-2 lg:text-sm">
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
              <div className="mt-2 flex flex-col gap-2 min-[420px]:flex-row lg:mt-3">
                <Link href="/products?sort=newest&page=1" className="landing-primary landing-hero-cta whitespace-nowrap text-sm sm:min-h-10 sm:text-xs lg:min-h-11 lg:text-sm">
                  مشاهده محصولات
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <Link href={REQUEST_URL} className="landing-secondary landing-hero-cta whitespace-nowrap text-sm sm:min-h-10 sm:text-xs lg:min-h-11 lg:text-sm">
                  ثبت درخواست حضوری
                  <CalendarDays className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </Motion>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="دسترسی سریع">
          {quickAccess.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="landing-quick-card group sm:gap-2 sm:p-3 lg:gap-3 lg:p-4">
                <Icon className="h-8 w-8 shrink-0 text-[#1269f4] lg:h-10 lg:w-10" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black sm:text-base lg:text-lg">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">
                    {item.description}
                  </p>
                </div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f5ff] text-[#1269f4] lg:h-8 lg:w-8">
                  <ChevronLeft className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </section>

        <Motion distance={12} duration={0.4}>
          <section className="landing-section overflow-hidden rounded-2xl bg-[#073c94] text-white sm:grid sm:min-h-[210px] sm:grid-cols-[60%_40%] sm:rounded-[24px] lg:min-h-[280px]" dir="ltr">
            <div className="relative aspect-[3/1] w-full sm:aspect-auto sm:h-full">
              <Image
                src="/White PS5 console with controller on blue-2.png"
                alt="کنسول سفید PS5 و دسته روی پس‌زمینه آبی"
                fill
                priority
                sizes="(max-width: 639px) 100vw, 1320px"
                className="object-cover object-[72%_center]"
              />
            </div>
            <div className="flex flex-col items-start justify-center bg-[#073c94] p-5 text-right sm:px-6 sm:py-4 lg:px-10" dir="rtl">
              <div className="flex items-center gap-2 text-xs font-black sm:text-sm">
                <span className="rounded-md bg-red-500 px-2 py-1">جدید</span>
                <span>PS5 تا ورژن ۱۳.۶۰</span>
              </div>
              <h2 className="mt-2 text-2xl font-black leading-tight sm:text-[26px] lg:text-4xl">بالاخره کپی‌خور شد</h2>
              <p className="mt-2 text-sm leading-6 text-blue-50 sm:text-sm lg:text-base">
                در حال تست و آماده‌سازی بازی‌های نسل هشتم.
              </p>
              <Link href={REQUEST_URL} className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#0c51b9]">
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

        <section className="landing-section landing-panel p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-xl font-black sm:text-2xl lg:text-[28px]">نمی‌دونی چی بازی کنی؟</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              براساس تگ‌های واقعی بازی‌های فروشگاه انتخاب کن
            </p>
          </div>
          {data.genres.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {data.genres.map((genre) => {
                const Icon =
                  genreIcons[genre.slug as keyof typeof genreIcons] || Gamepad2;
                return (
                  <Link
                    key={genre.slug}
                    href={"/products?category=games&tag=" + genre.slug + "&sort=newest&page=1"}
                    className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-[#e5edf9] bg-white px-3 text-sm font-black transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Icon className="h-5 w-5 text-[#1469f5]" />
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

        <section className="landing-section landing-panel p-4 sm:p-5" aria-labelledby="console-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="console-heading" className="text-xl font-black sm:text-2xl lg:text-[28px]">
                کنسول بعدیت رو انتخاب کن
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                کنسول‌های نو و کارکرده منتشرشده فروشگاه
              </p>
            </div>
            <Link href="/products?category=consoles&sort=newest&page=1" className="inline-flex min-h-10 items-center gap-1 text-sm font-black text-[#1469f5]">
              همه کنسول‌ها <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.consoles.length > 0 ? (
            <div className={"grid gap-4 " + (data.consoles.length <= 2 ? "mx-auto grid-cols-1 min-[480px]:grid-cols-2 sm:max-w-[760px]" : "grid-cols-2 sm:grid-cols-4")}>
              {data.consoles.map((product) => {
                const condition = conditionLabel(product);
                return (
                  <article key={product._id} className="rounded-xl border border-[#e2ebfb] bg-white p-3 shadow-[0_6px_18px_rgba(15,61,130,0.05)]">
                    <Link href={"/product/" + product.slug} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-[#f7f9fd]">
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
                    <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 sm:text-base">{product.title}</h3>
                    {condition && (
                      <span className="mt-1 inline-flex rounded-md bg-[#edf4ff] px-2 py-1 text-xs font-bold text-[#1469f5]">
                        {condition}
                      </span>
                    )}
                    <Link href={"/product/" + product.slug} className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#bad2ff] px-3 text-sm font-black text-[#1262e7]">
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
          className="landing-section landing-panel overflow-hidden sm:grid sm:min-h-[clamp(160px,20vw,280px)] sm:grid-cols-2"
          dir="ltr"
        >
            <div className="relative h-[260px] sm:h-full">
              <Image
                src="/White controller on blue repair bench-3.png"
                alt="دسته پلی استیشن روی میز تعمیرات تخصصی"
                fill
                loading="eager"
                sizes="(max-width: 639px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
            <div className="flex flex-col justify-center p-4 text-right sm:p-6" dir="rtl">
              <h2 className="text-xl font-black sm:text-2xl lg:text-[28px]">
                کنسول یا دستگاهت مشکل داره؟
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                کنسول‌های تخصصی و دسته‌ات را به کارشناس بسپار
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {serviceCards.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.title}
                      className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-[#f6f9fe] px-2 text-center"
                    >
                      <Icon className="h-6 w-6 text-[#1469f5]" />
                      <span className="mt-2 text-xs font-black sm:text-sm">
                        {service.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/services"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1469f5] px-5 text-sm font-black text-white sm:w-fit"
              >
                مشاوره تعمیرات
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
        </section>

        <ServiceOrderSection />

        <section className="landing-section" aria-labelledby="benefits-heading">
          <div className="relative overflow-hidden rounded-[28px] border border-[#174f9f] bg-[radial-gradient(circle_at_15%_10%,#1765c9_0%,#082d6b_42%,#051d49_100%)] p-5 text-white shadow-[0_22px_55px_rgba(5,35,86,0.2)] sm:p-8 lg:p-10">
            <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black text-blue-50 backdrop-blur-sm sm:text-sm">
                  <BadgeCheck className="h-4 w-4 text-[#74aaff]" />
                  انتخاب مطمئن برای گیمرهای کرمان
                </span>
                <h2
                  id="benefits-heading"
                  className="mt-4 text-3xl font-black leading-[1.35] sm:text-4xl lg:text-[42px]"
                >
                  چرا کرمان آتاری؟
                </h2>
                <p className="mt-3 max-w-lg text-sm font-medium leading-7 text-blue-100 sm:text-base">
                  اینجا فقط محصول یا بازی تحویل نمی‌گیری؛ از انتخاب درست تا
                  راه‌اندازی و پشتیبانی، یک تیم متخصص و در دسترس کنارت است.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-blue-50 sm:text-sm">
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3">
                    <Store className="h-4 w-4 text-[#74aaff]" />
                    مراجعه حضوری در کرمان
                  </span>
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3">
                    <ShieldCheck className="h-4 w-4 text-[#74aaff]" />
                    پشتیبانی واقعی
                  </span>
                </div>

                <Link
                  href="/about-us"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#0b4aa8] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#082d6b]"
                >
                  آشنایی بیشتر با ما
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  const isLast = index === benefits.length - 1;

                  return (
                    <article
                      key={benefit.title}
                      className={`group relative min-h-[148px] rounded-2xl border border-white/15 bg-white/[0.09] p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.13] sm:p-5 ${
                        isLast ? "sm:col-span-2 sm:min-h-[126px]" : ""
                      }`}
                    >
                      <span className="absolute left-4 top-4 text-xs font-black tracking-widest text-white/30 sm:left-5 sm:top-5">
                        ۰{index + 1}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1262e7] shadow-[0_8px_22px_rgba(0,0,0,0.14)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-base font-black sm:text-lg">
                        {benefit.title}
                      </h3>
                      <p className="mt-1.5 max-w-xl text-xs leading-6 text-blue-100 sm:text-sm">
                        {benefit.text}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-panel p-4 sm:p-5" aria-labelledby="guide-heading">
          <div className="text-center">
            <h2 id="guide-heading" className="text-xl font-black sm:text-2xl lg:text-[28px]">
              کدوم کنسول برای تو مناسبه؟
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              با راهنمایی تخصصی، انتخابت رو دقیق‌تر کن
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {consoleGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <article
                  key={guide.title}
                  className="flex min-h-[84px] items-center gap-3 rounded-xl border border-[#e5edf9] bg-white p-3"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#1469f5]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black sm:text-base">{guide.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{guide.text}</p>
                  </div>
                  <Link
                    href={guide.href}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-[#bad2ff] px-3 text-xs font-black text-[#1469f5] sm:text-sm"
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

        <section className="landing-section landing-panel p-4 sm:p-5" aria-labelledby="articles-heading">
          <div className="mb-4 text-center">
            <h2 id="articles-heading" className="text-xl font-black sm:text-2xl lg:text-[28px]">
              از دنیای بازی بیشتر بخون
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              مطالب منتشرشده و خبرهای کرمان آتاری
            </p>
          </div>
          <div className={"grid gap-4 sm:grid-cols-2 " + (data.articles.length <= 1 ? "lg:mx-auto lg:max-w-[760px] lg:grid-cols-2" : "lg:grid-cols-4")}>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-40 flex-col justify-between rounded-xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-400 p-4 text-white"
            >
              <Instagram className="h-8 w-8" />
              <div>
                <h3 className="text-base font-black sm:text-lg">ما را در اینستاگرام دنبال کنید</h3>
                <span className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-lg bg-white px-4 text-sm font-black text-rose-600">
                  مشاهده صفحه <ArrowLeft className="h-3 w-3" />
                </span>
              </div>
            </a>
            {data.articles.map((article) => (
              <article
                key={article._id}
                className="group overflow-hidden rounded-xl border border-[#e5edf9] bg-white"
              >
                <Link href={"/blog/" + article.slug} className="relative block aspect-[16/8] overflow-hidden bg-slate-100">
                  <Image
                    src={article.coverImage || "/atari-seeklogo.svg"}
                    alt={article.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 639px) 100vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-3">
                  <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 sm:text-base">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 lg:hidden">
                    {stripHtmlTags(
                      article.metaDescription || article.excerpt || article.content,
                    )}
                  </p>
                  <Link
                    href={"/blog/" + article.slug}
                    className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-black text-[#1469f5]"
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
          className="landing-section landing-panel overflow-hidden sm:grid sm:min-h-[240px] sm:grid-cols-[1.15fr_0.85fr] lg:min-h-[280px]"
          dir="ltr"
          aria-labelledby="visit-heading"
        >
          <iframe
            title="نقشه فروشگاه کرمان آتاری"
            src={MAP_EMBED_URL}
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-[260px] w-full border-0 sm:min-h-full"
          />
          <div className="flex flex-col justify-center p-5 text-right sm:p-6" dir="rtl">
            <h2 id="visit-heading" className="text-xl font-black sm:text-2xl lg:text-[28px]">
              حضوری منتظرتیم
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600 sm:text-base">
              کرمان، خیابان ناصریه، بین کوچه ۲ و ۴، نبش داروخانه مادر
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-[#1469f5]" /> صبح ۹ تا ۱۲
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-[#1469f5]" /> عصر ۴ تا ۸
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2 min-[440px]:flex-row">
              <Link href={REQUEST_URL} className="landing-primary flex-1 text-sm">
                ثبت درخواست حضوری
              </Link>
              <a
                href={MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-secondary flex-1 text-sm"
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
                className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-black text-slate-500"
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
