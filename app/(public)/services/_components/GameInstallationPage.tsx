import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, Gamepad2, Plus, Truck } from "lucide-react";
import Link from "@/app/components/navigation/NavigationFeedback";
import { gameInstallationPages, installationPages, type InstallationConsole } from "@/lib/game-installation-pages";
import { STORE_ORGANIZATION_ID, toAbsoluteUrl } from "@/lib/site";

const requestPath = "/my-profile?step=6";
const accountGamesPath = "/category/account-games";
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const heading = "text-xl font-black text-[#0b1d48] sm:text-2xl";
const paragraph = "text-sm leading-7 text-slate-700";
const primaryLink = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800";

export function gameInstallationMetadata(device: InstallationConsole): Metadata {
  const page = gameInstallationPages[device];
  const canonical = toAbsoluteUrl(page.path);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${page.title} | کرمان آتاری`,
      description: page.description,
      url: canonical,
      type: "website",
      locale: "fa_IR",
      siteName: "کرمان آتاری",
      images: [{ url: toAbsoluteUrl(encodeURI(page.image.src)), alt: page.image.alt }],
    },
  };
}

export function GameInstallationLinks() {
  return (
    <section aria-label="نصب بازی پلی‌استیشن در کرمان" className={panel}>
      <h2 className={heading}>نصب بازی پلی‌استیشن در کرمان</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {installationPages.map((page) => (
          <Link key={page.path} href={page.path} className="flex min-h-11 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100">
            <Gamepad2 aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>{page.title}</span>
            <ArrowLeft aria-hidden="true" className="mr-auto h-4 w-4 shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function GameInstallationPage({ device }: { device: InstallationConsole }) {
  const page = gameInstallationPages[device];
  const otherPage = gameInstallationPages[device === "ps4" ? "ps5" : "ps4"];
  const canonical = toAbsoluteUrl(page.path);
  const crumbs = [
    { name: "خانه", path: "/" },
    { name: "خدمات", path: "/services" },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${canonical}#service`,
        name: page.title,
        description: page.description,
        serviceType: `نصب بازی ${page.console}`,
        url: canonical,
        areaServed: { "@type": "City", name: "کرمان" },
        provider: { "@id": STORE_ORGANIZATION_ID },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [...crumbs, { name: page.title, path: page.path }].map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: toAbsoluteUrl(crumb.path),
        })),
      },
    ],
  };

  return (
    <article dir="rtl" className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="مسیر راهنما" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          {crumbs.map((crumb) => (
            <li key={crumb.path} className="flex items-center gap-2">
              <Link href={crumb.path} className="hover:text-blue-800 hover:underline">{crumb.name}</Link>
              <span aria-hidden="true">/</span>
            </li>
          ))}
          <li aria-current="page" className="font-semibold text-slate-900">{page.title}</li>
        </ol>
      </nav>

      <header className="grid overflow-hidden rounded-3xl bg-gradient-to-l from-blue-900 to-[#0b1d48] text-white md:grid-cols-[3fr_2fr]">
        <div className="space-y-4 p-5 sm:p-8 lg:p-10">
          <h1 className="text-3xl font-black leading-snug sm:text-4xl">{page.title}</h1>
          <p className="text-sm leading-8 text-blue-50 sm:text-base">{page.intro}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href={requestPath} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-blue-900 hover:bg-blue-50">
              ثبت درخواست نصب بازی
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href={accountGamesPath} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold hover:bg-blue-800">
              خرید بازی‌های اکانتی
            </Link>
          </div>
        </div>
        <div className="relative aspect-[2/1] overflow-hidden md:aspect-auto">
          <Image src={page.image.src} alt={page.image.alt} fill sizes="(min-width: 768px) 38vw, 100vw" className="object-cover" />
        </div>
      </header>

      <section className={panel} aria-labelledby="installation-types">
        <h2 id="installation-types" className={heading}>تفاوت نصب اکانتی و کپی‌خور {page.console}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-blue-50 p-4">
            <h3 className="font-black text-blue-900">نصب اکانتی</h3>
            <p className={paragraph}>{page.account}</p>
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-4">
            <h3 className="font-black text-slate-900">نصب کپی‌خور</h3>
            <p className={paragraph}>{page.copy}</p>
          </div>
        </div>
        <h3 className="mt-5 font-black text-[#0b1d48]">ظرفیت‌های ۲ و ۳ بازی اکانتی</h3>
        <p className={`mt-2 ${paragraph}`}>ظرفیت اکانت به شیوه دسترسی به بازی مربوط است. گزینه‌های عرضه‌شده و شرایط استفاده را در صفحه همان بازی بررسی کنید.</p>
        <dl className={`mt-3 grid gap-3 sm:grid-cols-2 ${paragraph}`}>
          <div>
            <dt className="font-bold text-slate-900">ظرفیت ۲</dt>
            <dd>اگر برای بازی عرضه شده، روش فعال‌سازی و نیاز به اینترنت را در توضیحات همان محصول بخوانید.</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-900">ظرفیت ۳</dt>
            <dd>پیش از انتخاب، شرایط استفاده از حساب و محدودیت‌های دسترسی اعلام‌شده برای همان محصول را بررسی کنید.</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={panel} aria-labelledby="installation-steps">
          <h2 id="installation-steps" className={heading}>مراحل ثبت درخواست نصب</h2>
          <ol className={`mt-3 list-decimal space-y-2 pr-5 ${paragraph}`}>
            <li>وارد حساب کاربری شوید و خدمت نصب بازی و دستگاه {page.console} را انتخاب کنید.</li>
            <li>نوع نصب را مشخص کنید و بازی‌های مدنظرتان را از فهرست انتخاب کنید.</li>
            <li>مراجعه حضوری یا پیک را انتخاب کنید. برای مراجعه، روز و ساعت آزاد را مشخص کنید. برای پیک، آدرس و بازه دریافت دستگاه را وارد کنید.</li>
            <li>خلاصه درخواست را بررسی و آن را ثبت کنید.</li>
          </ol>
        </section>
        <section className={panel} aria-labelledby="installation-courier">
          <h2 id="installation-courier" className={`flex items-center gap-2 ${heading}`}>
            <Truck aria-hidden="true" className="h-6 w-6 shrink-0 text-blue-700" />
            دریافت و تحویل کنسول با پیک در کرمان
          </h2>
          <p className={`mt-3 ${paragraph}`}>اگر گزینه پیک برای آدرس شما فعال باشد، پیک کنسول را در بازه انتخابی از آدرس شما دریافت می‌کند و پس از انجام خدمت آن را برمی‌گرداند. پوشش آدرس و هزینه رفت‌وبرگشت در فرم درخواست مشخص می‌شود.</p>
          <h3 className="mt-4 font-black text-[#0b1d48]">هزینه نصب و پیک</h3>
          <p className={`mt-2 ${paragraph}`}>مبلغ نهایی خدمت پس از بررسی مشخص می‌شود. برای سفارش پیکی کپی‌خور، قیمت ثبت‌شده هر بازی در فرم انتخاب نمایش داده می‌شود. هزینه پیک نیز پس از انتخاب آدرس در فرم قابل مشاهده است.</p>
        </section>
      </div>

      <section className={panel} aria-labelledby="installation-faq">
        <h2 id="installation-faq" className={heading}>سوالات متداول نصب بازی {page.console}</h2>
        <div className="mt-4 space-y-2">
          {page.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-xl border border-blue-100 bg-white px-4 open:bg-blue-50">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-bold text-[#0b1d48]">
                {faq.question}
                <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-700 transition group-open:rotate-45" />
              </summary>
              <p className={`border-t border-blue-100 py-3 ${paragraph}`}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
        <Link href={requestPath} className={primaryLink}>ثبت درخواست نصب بازی {page.console}</Link>
        <Link href={otherPage.path} className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-blue-900 underline-offset-4 hover:underline">
          {otherPage.title}
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
