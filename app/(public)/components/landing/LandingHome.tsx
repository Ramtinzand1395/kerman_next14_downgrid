import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Gamepad2,
  Headphones,
  Home,
  Instagram,
  MapPin,
  Search,
  Send,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LandingData } from "@/lib/landing-data";
import { stripHtmlTags } from "@/helpers/stripHtmlTags";
import Cart from "../Cart";
import Motion from "../Motion";
import Faq from "./Faq";

const APPOINTMENT_URL = "/my-profile?step=6";
const INSTAGRAM_URL =
  "https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw==";
const MAP_URL =
  "https://maps.google.com/?q=%DA%A9%D8%B1%D9%85%D8%A7%D9%86%D8%8C%20%D8%AE%DB%8C%D8%A7%D8%A8%D8%A7%D9%86%20%D9%86%D8%A7%D8%B5%D8%B1%DB%8C%D9%87%D8%8C%20%D8%A8%DB%8C%D9%86%20%DA%A9%D9%88%DA%86%D9%87%20%DB%B2%20%D9%88%20%DB%B4%D8%8C%20%D9%86%D8%A8%D8%B4%20%D8%AF%D8%A7%D8%B1%D9%88%D8%AE%D8%A7%D9%86%D9%87%20%D9%85%D8%A7%D8%AF%D8%B1";

const quickAccess = [
  {
    title: "نصب بازی PS5",
    description: "انتخاب بازی و ثبت نوبت",
    href: APPOINTMENT_URL,
    icon: Gamepad2,
  },
  {
    title: "خدمات و تعمیرات",
    description: "سرویس تخصصی کنسول",
    href: "/services",
    icon: Wrench,
  },
  {
    title: "لوازم گیمینگ",
    description: "تجهیزات و لوازم جانبی",
    href: "/products?sort=newest&category=gaming-accessories&page=1",
    icon: Headphones,
  },
  {
    title: "نوبت حضوری",
    description: "ثبت سریع درخواست",
    href: APPOINTMENT_URL,
    icon: CalendarDays,
  },
];

const steps = [
  {
    title: "خدمتت رو انتخاب کن",
    text: "نصب بازی، سرویس یا تعمیر کنسول",
    icon: ClipboardList,
  },
  {
    title: "نوبت بگیر",
    text: "زمان مراجعه را در حساب کاربری ثبت کن",
    icon: CalendarDays,
  },
  {
    title: "بیا کرمان آتاری",
    text: "کنسولت را حضوری به تیم ما بسپار",
    icon: Store,
  },
];

const benefits = [
  {
    title: "تخصص کنسول",
    text: "راهنمایی برای انتخاب و نگهداری کنسول",
    icon: Gamepad2,
  },
  {
    title: "راهنمایی انتخاب",
    text: "پیشنهاد متناسب با نیاز و بودجه شما",
    icon: Search,
  },
  {
    title: "فروشگاه حضوری",
    text: "امکان مراجعه و گفت‌وگوی مستقیم در کرمان",
    icon: Store,
  },
  {
    title: "پشتیبانی واقعی",
    text: "پیگیری شفاف خدمات و سفارش‌ها",
    icon: UsersRound,
  },
];

function SectionHeading({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div>
        <h2 className="text-2xl font-black text-slate-950 md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-7 text-slate-500 md:text-base">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-bold text-blue-700 transition hover:text-blue-900 sm:inline-flex"
        >
          مشاهده همه
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function ProductRail({
  title,
  description,
  products,
  href,
}: {
  title: string;
  description: string;
  products: LandingData["equipment"];
  href: string;
}) {
  if (!products.length) return null;

  return (
    <Motion distance={22}>
      <section className="landing-section" aria-label={title}>
        <SectionHeading title={title} description={description} href={href} />
        <div
          className={
            "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:gap-6 " +
            (products.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-2")
          }
        >
          {products.map((product) => (
            <div
              key={product._id}
              className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <Cart game={product} />
            </div>
          ))}
        </div>
      </section>
    </Motion>
  );
}

export default function LandingHome({ data }: { data: LandingData }) {
  return (
    <div className="overflow-x-clip bg-[#f7faff] pb-24 text-slate-950 md:pb-0">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-10">
        <Motion direction="down" distance={18} duration={0.55}>
          <section className="relative overflow-hidden rounded-[28px] bg-[#062b7a] shadow-[0_24px_70px_rgba(4,49,137,0.2)]">
            <div className="relative aspect-[3/1] min-h-[240px] w-full md:min-h-[390px]">
              <Image
                src="/PS5 Hero Banner with Game Cases-1.png"
                alt="کنسول پلی‌استیشن ۵، دسته بازی و بازی‌های PS5"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1440px"
                className="object-cover object-left md:object-center"
              />
              <div className="absolute inset-0 hidden bg-gradient-to-l from-[#032c79]/95 via-[#032c79]/75 to-transparent md:block" />
            </div>

            <div className="relative bg-[#062b7a] p-6 text-white md:absolute md:inset-y-0 md:right-0 md:flex md:w-[54%] md:flex-col md:justify-center md:bg-transparent md:p-10 lg:p-14">
              <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-50 backdrop-blur">
                <BadgeCheck className="h-4 w-4" />
                فروش و خدمات تخصصی کنسول
              </span>
              <h1 className="max-w-2xl text-3xl font-black leading-[1.5] sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[1.35]">
                دنیای بازی، همین‌جا در کرمان
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-blue-50 sm:text-base lg:text-lg">
                خرید کنسول و لوازم، نصب بازی و خدمات تخصصی کنسول؛ با راهنمایی
                و پشتیبانی تیم کرمان آتاری.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products?sort=newest&page=1"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#062b7a] transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  مشاهده محصولات
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  href={APPOINTMENT_URL}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/55 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  دریافت نوبت حضوری
                  <CalendarDays className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </Motion>

        <Motion delay={0.04} distance={18}>
          <section
            className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
            aria-label="دسترسی سریع"
          >
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-[116px] flex-col items-start justify-between rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg md:min-h-[124px] md:flex-row md:items-center md:p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-3 md:mt-0 md:flex-1 md:pr-4">
                    <h2 className="text-sm font-black text-slate-900 md:text-base">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <ChevronLeft className="hidden h-4 w-4 text-blue-600 md:block" />
                </Link>
              );
            })}
          </section>
        </Motion>

        <Motion delay={0.05} distance={20}>
          <section className="landing-section relative overflow-hidden rounded-[28px] bg-[#052d83] text-white shadow-xl">
            <div className="relative aspect-[3/1] min-h-[220px] w-full md:min-h-[300px]">
              <Image
                src="/White PS5 console with controller on blue-2.png"
                alt="کنسول PS5 و دسته روی پس‌زمینه آبی"
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 1440px"
                className="object-cover object-right md:object-center"
              />
              <div className="absolute inset-0 hidden bg-gradient-to-r from-[#052d83]/95 via-[#052d83]/70 to-transparent md:block" />
            </div>
            <div className="relative bg-[#052d83] p-6 md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:flex-col md:justify-center md:bg-transparent md:p-10 lg:p-14">
              <span className="w-fit rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                جدید
              </span>
              <p className="mt-4 text-sm font-bold text-blue-100">
                PS5 تا ورژن ۱۳.۶۰
              </p>
              <h2 className="mt-1 text-3xl font-black leading-[1.5] md:text-5xl">
                بالاخره کپی‌خور شد
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-8 text-blue-50 md:text-base">
                در حال تست و آماده‌سازی بازی‌های سازگار هستیم.
              </p>
              <Link
                href={APPOINTMENT_URL}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#052d83] transition hover:-translate-y-0.5 hover:bg-blue-50 sm:w-fit"
              >
                دریافت نوبت
                <CalendarDays className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </Motion>

        {data.latestGames.length > 0 && (
          <ProductRail
            title="جدیدترین بازی‌ها"
            description="تازه‌ترین بازی‌های منتشرشده در فروشگاه"
            products={data.latestGames}
            href="/products?sort=newest&category=games&page=1"
          />
        )}

        {data.genres.length > 0 && (
          <Motion distance={20}>
            <section className="landing-section">
              <SectionHeading
                title="نمی‌دونی چی بازی کنی؟"
                description="براساس سبک‌های واقعی موجود در فروشگاه انتخاب کن"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
                {data.genres.map((genre) => (
                  <Link
                    key={genre.slug}
                    href={"/products?sort=newest&category=games&tag=" + genre.slug + "&page=1"}
                    className="rounded-2xl border border-blue-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                  >
                    <Gamepad2 className="mx-auto h-7 w-7 text-blue-700" />
                    <h3 className="mt-3 text-sm font-black text-slate-900">
                      {genre.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {genre.count.toLocaleString("fa-IR")} محصول
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </Motion>
        )}

        <ProductRail
          title="تجهیزات گیمینگ رو کامل کن"
          description="لوازم جانبی موجود، با قیمت و موجودی واقعی فروشگاه"
          products={data.equipment}
          href="/products?sort=newest&category=accessories&page=1"
        />

        {data.consoles.length > 0 && (
          <ProductRail
            title="کنسول‌های موجود"
            description="جدیدترین کنسول‌های منتشرشده در فروشگاه"
            products={data.consoles}
            href="/products?sort=newest&category=consoles&page=1"
          />
        )}

        <Motion distance={20}>
          <section className="landing-section overflow-hidden rounded-[28px] bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="grid lg:grid-cols-2">
              <div className="relative min-h-[260px] lg:min-h-[430px]">
                <Image
                  src="/White controller on blue repair bench-3.png"
                  alt="تعمیر و سرویس دسته و کنسول بازی"
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  <Wrench className="h-4 w-4" />
                  خدمات تخصصی
                </span>
                <h2 className="mt-5 text-3xl font-black leading-[1.5] text-slate-950 md:text-4xl">
                  کنسولت با دستگاه مشکل داره؟
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-8 text-slate-600 md:text-base">
                  برای عیب‌یابی کنسول، تعمیر دسته و سرویس و نگهداری، درخواستت
                  را ثبت کن تا تیم کرمان آتاری راهنمایی‌ات کند.
                </p>
                <Link
                  href="/services"
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-800 sm:w-fit"
                >
                  مشاهده خدمات تعمیرات
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </Motion>

        <Motion distance={20}>
          <section className="landing-section">
            <SectionHeading
              title="فقط ۳ مرحله تا بازی کردن"
              description="مسیر دریافت خدمات حضوری ساده و شفاف است"
            />
            <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="relative flex items-center gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:min-h-[154px] md:flex-col md:items-start md:p-6"
                  >
                    <span className="absolute left-4 top-4 text-4xl font-black text-blue-50">
                      {"۰" + (index + 1).toLocaleString("fa-IR")}
                    </span>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {step.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </Motion>

        <Motion distance={20}>
          <section className="landing-section">
            <SectionHeading
              title="چطور می‌خوای خدمات بگیری؟"
              description="روش فعال فعلی، مراجعه حضوری با ثبت نوبت است"
            />
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <article className="rounded-[28px] border-2 border-blue-200 bg-white p-6 shadow-lg shadow-blue-900/5 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <Store className="h-7 w-7" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    فعال
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black">مراجعه حضوری</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  خدمت را انتخاب کن، نوبت بگیر و در زمان هماهنگ‌شده به فروشگاه
                  مراجعه کن.
                </p>
                <Link
                  href={APPOINTMENT_URL}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
                >
                  دریافت نوبت
                  <CalendarDays className="h-4 w-4" />
                </Link>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-slate-100/70 p-6 text-slate-500 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                    <Truck className="h-7 w-7" />
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-500">
                    به‌زودی
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-slate-500">
                  ارسال با پیک
                </h3>
                <p className="mt-2 text-sm leading-7">
                  دریافت کنسول از محل و بازگرداندن آن پس از انجام خدمات هنوز
                  فعال نشده است.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-6 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-400"
                >
                  فعلاً غیرفعال
                </button>
              </article>
            </div>
          </section>
        </Motion>

        <Motion distance={20}>
          <section className="landing-section rounded-[28px] bg-[#062b7a] p-6 text-white sm:p-8 lg:p-10">
            <div className="mb-6 md:mb-8">
              <h2 className="text-2xl font-black md:text-3xl">
                چرا کرمان آتاری؟
              </h2>
              <p className="mt-2 text-sm leading-7 text-blue-100 md:text-base">
                همراهی واقعی از انتخاب تا دریافت خدمات
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article
                    key={benefit.title}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
                  >
                    <Icon className="h-7 w-7 text-blue-200" />
                    <h3 className="mt-4 text-sm font-black sm:text-base">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-blue-100 sm:text-sm">
                      {benefit.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </Motion>

        <Motion distance={20}>
          <Faq />
        </Motion>

        <Motion distance={20}>
          <section className="landing-section">
            <SectionHeading
              title="از دنیای بازی بیشتر بخون"
              description="مطالب منتشرشدهٔ کرمان آتاری و راه ارتباط با ما"
              href={data.articles.length ? "/blog" : undefined}
            />
            <div
              className={
                "grid gap-4 md:grid-cols-2 lg:gap-6 " +
                (data.articles.length >= 3
                  ? "lg:grid-cols-4"
                  : "lg:grid-cols-2")
              }
            >
              {data.articles.map((article) => (
                <article
                  key={article._id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] bg-slate-100">
                    <Image
                      src={article.coverImage || "/atari-seeklogo.svg"}
                      alt={article.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 min-h-14 text-base font-black leading-7 text-slate-900">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                      {stripHtmlTags(
                        article.metaDescription ||
                          article.excerpt ||
                          article.content,
                      )}
                    </p>
                    <Link
                      href={"/blog/" + article.slug}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-700"
                    >
                      مطالعه مقاله
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[280px] flex-col justify-between rounded-2xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-400 p-6 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Instagram className="h-9 w-9" />
                <div>
                  <h3 className="text-2xl font-black leading-[1.6]">
                    ما را در اینستاگرام دنبال کنید
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/85">
                    خبرها و اطلاع‌رسانی‌های کرمان آتاری را از صفحه رسمی دنبال
                    کنید.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-rose-600">
                    مشاهده صفحه
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </div>
              </a>
            </div>
          </section>
        </Motion>

        <Motion distance={20}>
          <section className="landing-section overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex min-h-[300px] flex-col justify-center bg-blue-50 p-6 sm:p-8 lg:p-10">
                <MapPin className="h-10 w-10 text-blue-700" />
                <h2 className="mt-5 text-3xl font-black text-slate-950">
                  حضوری منتظرتیم
                </h2>
                <p className="mt-4 text-sm font-bold leading-8 text-slate-700 md:text-base">
                  کرمان، خیابان ناصریه، بین کوچه ۲ و ۴، نبش داروخانه مادر
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2">
                    <Clock3 className="h-4 w-4 text-blue-700" />
                    صبح: ۹ تا ۱۲
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2">
                    <Clock3 className="h-4 w-4 text-blue-700" />
                    عصر: ۴ تا ۸
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <h3 className="text-xl font-black text-slate-950 md:text-2xl">
                  قبل از مراجعه، نوبتت را ثبت کن
                </h3>
                <p className="mt-3 text-sm leading-8 text-slate-600">
                  با ثبت نوبت، تیم فروشگاه از درخواست شما مطلع می‌شود و
                  هماهنگی مراجعه سریع‌تر انجام خواهد شد.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={APPOINTMENT_URL}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    دریافت نوبت حضوری
                    <CalendarDays className="h-4 w-4" />
                  </Link>
                  <a
                    href={MAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-50"
                  >
                    مسیریابی
                    <Send className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </Motion>
      </div>

      <nav
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-md grid-cols-5 items-end rounded-2xl border border-blue-100 bg-white/95 px-2 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.25)] backdrop-blur md:hidden"
        aria-label="دسترسی سریع موبایل"
      >
        {[
          { label: "خانه", href: "/", icon: Home },
          {
            label: "بازی‌ها",
            href: "/products?sort=newest&category=games&page=1",
            icon: Gamepad2,
          },
          {
            label: "نوبت",
            href: APPOINTMENT_URL,
            icon: CalendarDays,
            primary: true,
          },
          {
            label: "فروشگاه",
            href: "/products?sort=newest&page=1",
            icon: ShoppingBag,
          },
          { label: "حساب", href: "/my-profile?step=1", icon: UserRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                "flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold " +
                (item.primary
                  ? "-mt-7 text-blue-800"
                  : "min-h-12 text-slate-500")
              }
            >
              <span
                className={
                  item.primary
                    ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/30"
                    : "flex h-7 w-7 items-center justify-center"
                }
              >
                <Icon className={item.primary ? "h-7 w-7" : "h-5 w-5"} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
