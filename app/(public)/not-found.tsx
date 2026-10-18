import Image from "next/image";
import Link from "next/link";
import { Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <section
      className="relative isolate overflow-hidden border-y border-blue-100 bg-[#eef6ff]"
      aria-labelledby="not-found-title"
    >
      <Image
        src="/images/404/404-background.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-white/95 via-white/75 to-blue-50/20" />

      <div className="mx-auto grid min-h-[570px] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:min-h-[620px] md:grid-cols-2 md:gap-6 md:py-16 lg:px-8">
        <div className="text-center md:text-right">
          <p
            aria-hidden="true"
            className="bg-gradient-to-b from-[#1b7cff] to-[#0037a7] bg-clip-text text-8xl font-black leading-none tracking-[-0.08em] text-transparent drop-shadow-[0_8px_16px_rgba(16,92,214,0.2)] sm:text-9xl lg:text-[11rem]"
          >
            404
          </p>
          <h1
            id="not-found-title"
            className="mt-3 text-3xl font-black leading-tight text-[#071c4d] sm:text-4xl lg:text-5xl"
          >
            صفحه موردنظر پیدا نشد!
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-8 text-slate-700 sm:text-lg md:mx-0 lg:text-xl lg:leading-9">
            انگار مسیر بازی رو اشتباه اومدی! نگران نباش، از اینجا می‌تونی دوباره
            شروع کنی.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#075ee8] px-6 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(7,94,232,0.24)] transition hover:bg-[#004ec5] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-base"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              بازگشت به صفحه اصلی
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#1269ee] bg-white/85 px-6 py-3 text-sm font-black text-[#0754c7] shadow-sm backdrop-blur-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-base"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              مشاهده محصولات
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center md:max-w-none">
          <div className="absolute inset-x-[12%] bottom-[5%] h-[22%] rounded-full bg-blue-500/20 blur-3xl" />
          <Image
            src="/images/404/404-hero-controller.webp"
            alt="دسته بازی در یک پورتال آبی"
            width={1352}
            height={1122}
            priority
            sizes="(max-width: 767px) 92vw, (max-width: 1280px) 48vw, 620px"
            className="relative h-auto w-full drop-shadow-[0_24px_38px_rgba(14,74,170,0.22)]"
          />
        </div>
      </div>
    </section>
  );
}
