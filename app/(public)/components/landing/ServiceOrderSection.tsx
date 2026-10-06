"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShoppingCart,
  Truck,
  UsersRound,
  Zap,
} from "lucide-react";

const REQUEST_URL = "/my-profile?step=6";
const ASSET_ROOT = "/بنر دریافت سفارش";
const steps = [
  { number: "۱", title: "انتخاب خدمت", description: "نصب بازی یا تعمیرات را مشخص کن", image: ASSET_ROOT + "/Royal Blue Document Cursor Icon-3.png" },
  { number: "۲", title: "انتخاب روش دریافت", description: "روش دریافت خدمات را انتخاب کن", image: ASSET_ROOT + "/Cobalt blue arrow signpost icon-4.png" },
  { number: "۳", title: "ثبت اطلاعات و زمان", description: "اطلاعات لازم را کامل کن و زمان را ثبت کن", image: ASSET_ROOT + "/Cobalt calendar and clock icon-5.png" },
];
const cardVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

function Connector() {
  return (
    <div className="hidden items-center lg:flex" aria-hidden="true">
      <span className="h-px flex-1 border-t-2 border-dashed border-[#afd2ff]" />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c8ddfb] bg-white text-[#0d68f6] shadow-[0_7px_18px_rgba(22,105,245,0.1)]">
        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="h-px flex-1 border-t-2 border-dashed border-[#afd2ff]" />
    </div>
  );
}

export default function ServiceOrderSection() {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section
      className="landing-section relative isolate overflow-hidden rounded-[28px] border border-[#dcecff] bg-[#f8fbff] px-3 py-10 shadow-[0_18px_50px_rgba(43,102,177,0.08)] sm:px-6 sm:py-12 lg:px-8 lg:py-14"
      dir="rtl"
      aria-labelledby="service-order-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_8%_17%,rgba(209,231,255,0.74),transparent_18%),radial-gradient(circle_at_92%_12%,rgba(218,235,255,0.72),transparent_20%),linear-gradient(180deg,#fbfdff_0%,#f3f9ff_55%,#fbfdff_100%)]" />
      <div className="pointer-events-none absolute -right-20 top-56 -z-10 h-72 w-72 rounded-full bg-[#e8f4ff]/80 blur-2xl sm:-right-28 sm:h-[430px] sm:w-[430px]" />
      <div className="pointer-events-none absolute -left-24 bottom-12 -z-10 h-72 w-72 rounded-full bg-[#e4f1ff]/80 blur-2xl sm:h-[400px] sm:w-[400px]" />
      <div className="pointer-events-none absolute left-4 top-[46%] -z-10 hidden h-24 w-24 opacity-55 sm:block" style={{ backgroundImage: "radial-gradient(circle, #9fc9ff 2px, transparent 2.5px)", backgroundSize: "18px 18px" }} aria-hidden="true" />
      <div className="pointer-events-none absolute right-6 top-16 -z-10 hidden h-20 w-20 opacity-45 sm:block" style={{ backgroundImage: "radial-gradient(circle, #9fc9ff 2px, transparent 2.5px)", backgroundSize: "18px 18px" }} aria-hidden="true" />
      <div className="pointer-events-none absolute -left-10 -top-4 -z-10 hidden h-48 w-64 sm:block lg:h-60 lg:w-80">
        <Image src={ASSET_ROOT + "/Cobalt blue DualSense controller cutout-6.png"} alt="" fill sizes="320px" className="object-contain object-left-top opacity-85" />
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 -z-10 hidden h-52 w-40 sm:block lg:h-64 lg:w-52">
        <Image src={ASSET_ROOT + "/White PlayStation 5 with blue glow-7.png"} alt="" fill sizes="208px" className="object-contain object-right-top opacity-85" />
      </div>

      <motion.div
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } } }}
      >
        <motion.header variants={cardVariants} transition={transition} className="relative z-10 mx-auto max-w-3xl text-center">
          <TitleOrnament />
          <h2 id="service-order-heading" className="text-[26px] font-black leading-[1.45] text-[#071943] sm:text-3xl lg:text-[38px]">
            فقط <span className="text-[#1269f5]">۳ مرحله</span> تا بازی کردن
          </h2>
          <p className="mt-2 text-sm font-medium leading-7 text-[#52658d] sm:text-base lg:text-lg">سفارش خدمات کرمان آتاری در چند مرحله ساده انجام می‌شود</p>
        </motion.header>

        <div className="relative z-10 mx-auto mt-7 grid max-w-[1220px] gap-3 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)_72px_minmax(0,1fr)] lg:gap-0">
          {steps.map((step, index) => (
            <div key={step.title} className="contents">
              <motion.article variants={cardVariants} transition={transition} className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-white/90 bg-white/95 px-5 py-7 text-center shadow-[0_14px_34px_rgba(37,91,154,0.1)] sm:min-h-[236px]">
                <span className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#1269f5] text-lg font-black text-white shadow-[0_7px_18px_rgba(18,105,245,0.28)]">{step.number}</span>
                <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#edf7ff] shadow-[inset_0_0_0_9px_rgba(255,255,255,0.55)] sm:h-28 sm:w-28">
                  <Image src={step.image} alt="" fill sizes="112px" className="object-contain p-4 sm:p-5" />
                </span>
                <h3 className="mt-4 text-lg font-black text-[#081945] sm:text-xl">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#52658d] sm:text-base">{step.description}</p>
              </motion.article>
              {index < steps.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        <motion.header variants={cardVariants} transition={transition} className="relative z-10 mx-auto mt-12 max-w-3xl text-center sm:mt-16">
          <TitleOrnament />
          <h2 className="text-[26px] font-black leading-[1.45] text-[#071943] sm:text-3xl lg:text-[38px]">
            چطور می‌خوای <span className="text-[#1269f5]">خدمات بگیری</span>؟
          </h2>
          <p className="mt-2 text-sm font-medium leading-7 text-[#52658d] sm:text-base lg:text-lg">با توجه به نیازت یکی از روش‌های زیر را انتخاب کن</p>
        </motion.header>

        <div className="relative z-10 mx-auto mt-7 grid max-w-[1260px] gap-5 lg:grid-cols-2">
          <motion.article variants={cardVariants} transition={transition} className="relative overflow-hidden rounded-[24px] border-2 border-[#b9d8ff] bg-white shadow-[0_16px_38px_rgba(40,101,171,0.1)]">
            <div className="grid min-h-[390px] sm:grid-cols-[1.03fr_0.97fr]" dir="rtl">
              <div className="relative z-10 flex flex-col p-5 sm:p-6 lg:p-7">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-black text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />به‌زودی</span>
                <h3 className="mt-4 text-2xl font-black text-[#071943] sm:text-3xl">ارسال با پیک</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-[#52658d] sm:text-base">ارسال و دریافت کنسول و لوازم در محل مورد نظر شما</p>
                <ul className="mt-5 space-y-3 text-sm font-bold text-[#52658d] sm:text-base">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#1269f5]" /> تحویل و دریافت در محل</li>
                  <li className="flex items-center gap-2"><Zap className="h-5 w-5 text-[#1269f5]" /> ثبت سریع سفارش</li>
                  <li className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-[#1269f5]" /> مناسب برای سفارش آنلاین</li>
                </ul>
                <p className="mt-5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">این خدمت به‌زودی فعال می‌شود</p>
                <button type="button" disabled className="mt-3 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-200 px-2 text-xs font-black text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 sm:mt-auto lg:text-[13px] xl:text-base">
                  <Truck className="h-5 w-5" />ارسال با پیک؛ به‌زودی
                </button>
              </div>
              <CardImage src={ASSET_ROOT + "/Blue courier with gamepad box-2.png"} alt="پیک موتوری برای جابه‌جایی کنسول و لوازم" position="object-[43%_center]" />
            </div>
          </motion.article>

          <motion.article variants={cardVariants} transition={transition} className="relative overflow-hidden rounded-[24px] border border-[#dbe9fb] bg-white shadow-[0_16px_38px_rgba(40,101,171,0.1)]">
            <div className="grid min-h-[390px] sm:grid-cols-[1.03fr_0.97fr]" dir="rtl">
              <div className="relative z-10 flex flex-col p-5 sm:p-6 lg:p-7">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#cfe1fb] bg-[#eff6ff] px-3.5 py-2 text-xs font-black text-[#1269f5]"><MapPin className="h-4 w-4" />در فروشگاه</span>
                <h3 className="mt-4 text-2xl font-black text-[#071943] sm:text-3xl">مراجعه حضوری</h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-[#52658d] sm:text-base">حضور در فروشگاه کرمان آتاری و دریافت خدمات به صورت حضوری</p>
                <ul className="mt-5 space-y-3 text-sm font-bold text-[#52658d] sm:text-base">
                  <li className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#1269f5]" /> دریافت نوبت</li>
                  <li className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#1269f5]" /> مراجعه به فروشگاه</li>
                  <li className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#1269f5]" /> مناسب خدمات حضوری</li>
                </ul>
                <Link href={REQUEST_URL} className="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#1269f5] bg-white px-2 text-xs font-black text-[#1269f5] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:mt-auto lg:text-[13px] xl:text-base">
                  <CalendarDays className="h-5 w-5" />دریافت نوبت حضوری<ArrowLeft className="mr-auto h-5 w-5" />
                </Link>
              </div>
              <CardImage src={ASSET_ROOT + "/Cobalt Gaming Storefront in Daylight-1.png"} alt="نمای تزئینی فروشگاه تجهیزات گیمینگ" position="object-center" />
            </div>
          </motion.article>
        </div>
      </motion.div>
    </section>
  );
}

function TitleOrnament() {
  return (
    <div className="mx-auto mb-3 flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-20 bg-gradient-to-l from-[#1269f5] to-transparent" />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
        <Image src={ASSET_ROOT + "/Cobalt blue DualSense controller cutout-6.png"} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
      </span>
      <span className="h-px w-20 bg-gradient-to-r from-[#1269f5] to-transparent" />
    </div>
  );
}

function CardImage({ src, alt, position }: { src: string; alt: string; position: string }) {
  return (
    <div className="relative min-h-[250px] overflow-hidden sm:min-h-full">
      <Image src={src} alt={alt} fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 48vw, 300px" className={"object-cover " + position} />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 bg-gradient-to-l from-white to-transparent sm:block" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent sm:hidden" />
    </div>
  );
}
