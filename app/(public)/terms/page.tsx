import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Box,
  ChevronLeft,
  CircleAlert,
  FileCheck2,
  Headphones,
  LockKeyhole,
  PackageCheck,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "قوانین و مقررات",
  description:
    "قوانین استفاده از وب‌سایت کرمان آتاری، ثبت سفارش، پرداخت، ارسال، انصراف و مرجوعی، کالاهای دیجیتال و حریم خصوصی کاربران.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "قوانین و مقررات | کرمان آتاری",
    description:
      "شرایط استفاده، خرید، ارسال، مرجوعی و حریم خصوصی در فروشگاه اینترنتی کرمان آتاری.",
    url: `${SITE_URL}/terms`,
    siteName: "کرمان آتاری",
    locale: "fa_IR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const sections = [
  { id: "acceptance", title: "پذیرش قوانین", icon: FileCheck2 },
  { id: "account", title: "حساب کاربری", icon: UserRoundCheck },
  { id: "products", title: "محصولات و قیمت‌ها", icon: Box },
  { id: "orders", title: "ثبت سفارش و پرداخت", icon: Banknote },
  { id: "shipping", title: "ارسال و تحویل", icon: PackageCheck },
  { id: "returns", title: "انصراف و مرجوعی", icon: RefreshCcw },
  { id: "digital", title: "کالاهای دیجیتال", icon: ShieldCheck },
  { id: "privacy", title: "حریم خصوصی", icon: LockKeyhole },
  { id: "support", title: "پشتیبانی و شکایت", icon: Headphones },
] as const;

const rules = [
  {
    id: "acceptance",
    title: "پذیرش قوانین و دامنه استفاده",
    icon: FileCheck2,
    content: (
      <>
        <p>
          استفاده از وب‌سایت کرمان آتاری، ایجاد حساب کاربری یا ثبت سفارش به معنای
          مطالعه و پذیرش این قوانین است. این شرایط برای خرید کالاهای فیزیکی،
          محصولات دیجیتال و خدماتی که از طریق سایت ارائه می‌شوند کاربرد دارد.
        </p>
        <p>
          در صورت تغییر مقررات یا شیوه ارائه خدمات، نسخه جدید در همین صفحه منتشر
          می‌شود. حقوقی که پیش از تغییر برای سفارش‌های قطعی ایجاد شده‌اند، مطابق
          قوانین لازم‌الاجرا حفظ خواهند شد.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "حساب کاربری و مسئولیت کاربران",
    icon: UserRoundCheck,
    content: (
      <ul>
        <li>اطلاعات هویتی، شماره تماس و نشانی تحویل باید صحیح و به‌روز باشند.</li>
        <li>
          مسئولیت حفظ محرمانگی کد ورود و فعالیت‌های انجام‌شده با حساب کاربری بر
          عهده کاربر است؛ در صورت مشاهده استفاده مشکوک، موضوع را سریعاً به
          پشتیبانی اطلاع دهید.
        </li>
        <li>
          ثبت‌نام یا خرید با هویت دیگران، ایجاد اختلال در سایت و هرگونه استفاده
          غیرقانونی از خدمات مجاز نیست.
        </li>
      </ul>
    ),
  },
  {
    id: "products",
    title: "اطلاعات محصولات، قیمت و موجودی",
    icon: Box,
    content: (
      <>
        <p>
          تلاش می‌کنیم مشخصات، تصاویر، وضعیت نو یا کارکرده بودن و قیمت محصولات
          دقیق و شفاف باشد. با این حال تفاوت جزئی رنگ تصویر در نمایشگرهای مختلف
          ممکن است رخ دهد.
        </p>
        <p>
          قیمت نهایی و هزینه‌های قابل پرداخت پیش از تأیید سفارش نمایش داده
          می‌شوند. قرار گرفتن کالا در سبد خرید به معنای رزرو آن نیست و سفارش پس
          از پرداخت موفق و تأیید موجودی قطعی می‌شود. اگر به دلیل خطای فنی یا عدم
          موجودی امکان انجام سفارش وجود نداشته باشد، موضوع به خریدار اعلام و وجه
          پرداختی مسترد می‌شود.
        </p>
      </>
    ),
  },
  {
    id: "orders",
    title: "ثبت سفارش و پرداخت",
    icon: Banknote,
    content: (
      <ul>
        <li>
          پس از ثبت سفارش، اطلاعات خرید برای شماره تماس ثبت‌شده در دسترس قرار
          می‌گیرد. تأیید سیستمی اولیه به‌تنهایی به معنای تأیید نهایی موجودی نیست.
        </li>
        <li>
          پرداخت اینترنتی از طریق درگاه معرفی‌شده در سایت یا موجودی کیف پول
          انجام می‌شود. کرمان آتاری اطلاعات کامل کارت بانکی کاربران را ذخیره
          نمی‌کند.
        </li>
        <li>
          در پرداخت ناموفق، اگر مبلغ از حساب کسر شود، بازگشت وجه معمولاً از سوی
          شبکه بانکی انجام می‌شود؛ برای پیگیری می‌توانید شماره سفارش و کد پیگیری
          را به پشتیبانی اعلام کنید.
        </li>
      </ul>
    ),
  },
  {
    id: "shipping",
    title: "ارسال، تحویل و بررسی مرسوله",
    icon: PackageCheck,
    content: (
      <>
        <p>
          روش، هزینه و بازه تقریبی ارسال بر اساس مقصد و نوع سفارش در فرایند خرید
          مشخص می‌شود. تأخیرهای خارج از کنترل فروشگاه، مانند اختلال شرکت حمل یا
          شرایط جوی، ممکن است بر زمان تحویل اثر بگذارند؛ تیم پشتیبانی تا رسیدن
          مرسوله پیگیری لازم را انجام می‌دهد.
        </p>
        <p>
          هنگام تحویل، سلامت ظاهری بسته را بررسی کنید. اگر بسته آسیب جدی دارد یا
          محتویات آن با سفارش متفاوت است، از بسته و برچسب ارسال عکس تهیه کرده و
          در کوتاه‌ترین زمان با پشتیبانی تماس بگیرید. تحویل سفارش به شخص حاضر در
          نشانی ثبت‌شده، تحویل به خریدار محسوب می‌شود.
        </p>
      </>
    ),
  },
  {
    id: "returns",
    title: "حق انصراف، تعویض و مرجوعی",
    icon: RefreshCcw,
    content: (
      <>
        <p>
          برای کالاهای مشمول، خریدار مطابق قانون تجارت الکترونیکی حداقل هفت روز
          کاری از زمان تحویل فرصت اعلام انصراف دارد. در انصراف بدون ایراد کالا،
          هزینه بازگرداندن کالا بر عهده خریدار است. برای هماهنگی و حفظ امکان
          بررسی، پیش از ارسال مجدد با پشتیبانی تماس بگیرید و کالا، متعلقات و
          بسته‌بندی آن را در وضعیت اولیه نگه دارید.
        </p>
        <p>
          اگر کالا معیوب، آسیب‌دیده یا مغایر سفارش باشد، موضوع با ارائه تصویر و
          اطلاعات سفارش بررسی می‌شود و راهکار مناسب شامل تعویض، رفع ایراد یا
          استرداد وجه اعلام خواهد شد. استثناهای قانونی حق انصراف، از جمله برخی
          نرم‌افزارهای بازشده و محصولات رمزدار مصرف‌شده، در بخش بعد توضیح داده
          شده‌اند.
        </p>
      </>
    ),
  },
  {
    id: "digital",
    title: "بازی‌ها، اکانت‌ها و محصولات دیجیتال",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          شرایط ظرفیت، ریجن، مدت دسترسی، روش فعال‌سازی و محدودیت‌های هر محصول
          دیجیتال در صفحه همان محصول یا پیش از تحویل اعلام می‌شود. کاربر موظف
          است پیش از خرید، سازگاری محصول با دستگاه و حساب کاربری خود را بررسی
          کند و راهنمای فعال‌سازی را رعایت نماید.
        </p>
        <p>
          پس از تحویل کد، نمایش رمز، فعال‌سازی اکانت یا شروع ارائه خدمت با توافق
          کاربر، امکان انصراف صرفاً در حدود مقررات لازم‌الاجرا و شرایط اعلام‌شده
          محصول وجود دارد. وجود ایراد فنی یا مغایرت با مشخصات اعلامی، از طریق
          پشتیبانی بررسی و رفع خواهد شد. انتقال یا انتشار اطلاعات دسترسی برای
          دیگران ممکن است موجب از دست رفتن پشتیبانی آن محصول شود.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "حریم خصوصی و حفاظت از اطلاعات",
    icon: LockKeyhole,
    content: (
      <>
        <p>
          اطلاعاتی مانند نام، شماره تماس، نشانی، سوابق سفارش و پیام‌های پشتیبانی
          فقط برای ایجاد حساب، پردازش و تحویل سفارش، پشتیبانی، پیشگیری از تقلب و
          انجام تکالیف قانونی استفاده می‌شوند.
        </p>
        <p>
          اطلاعات کاربران فروخته نمی‌شود و تنها در حد لازم با ارائه‌دهندگان خدمت
          مانند شرکت حمل، درگاه پرداخت یا مراجع قانونی دارای صلاحیت به اشتراک
          گذاشته می‌شود. کاربر می‌تواند برای اصلاح اطلاعات حساب یا طرح درخواست
          مرتبط با داده‌های خود با پشتیبانی تماس بگیرد.
        </p>
      </>
    ),
  },
  {
    id: "support",
    title: "پشتیبانی، شکایت و حل اختلاف",
    icon: Headphones,
    content: (
      <>
        <p>
          برای پیگیری سفارش، مرجوعی یا ثبت شکایت، شماره سفارش و شرح موضوع را از
          طریق صفحه تماس با ما یا شماره‌های فروشگاه ارسال کنید. تلاش می‌کنیم
          درخواست‌ها با گفت‌وگو و در کوتاه‌ترین زمان حل شوند.
        </p>
        <p>
          این شرایط تابع قوانین جمهوری اسلامی ایران است و در موارد
          پیش‌بینی‌نشده، مقررات لازم‌الاجرا و مراجع صالح قانونی ملاک عمل خواهند
          بود.
        </p>
      </>
    ),
  },
] as const;

export default function TermsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "قوانین و مقررات کرمان آتاری",
        url: `${SITE_URL}/terms`,
        inLanguage: "fa-IR",
        dateModified: "2026-10-02",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "قوانین و مقررات",
            item: `${SITE_URL}/terms`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#001A6E] via-blue-900 to-slate-900 px-6 py-10 text-white shadow-xl shadow-blue-950/10 md:px-10 md:py-14">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-red-400/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-50 backdrop-blur">
            <ScrollText className="h-4 w-4" />
            شفافیت در خرید و استفاده از خدمات
          </div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">
            قوانین و مقررات کرمان آتاری
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-blue-50/90 md:text-base">
            این صفحه چارچوب استفاده از سایت، ثبت سفارش، پرداخت، ارسال، مرجوعی و
            نگهداری اطلاعات شما را توضیح می‌دهد. لطفاً پیش از خرید، بخش‌های مرتبط
            با محصول موردنظر خود را مطالعه کنید.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-blue-100 md:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              آخرین به‌روزرسانی: ۱۰ مهر ۱۴۰۵
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-emerald-100">
              <BadgeCheck className="h-4 w-4" />
              قابل دسترس پیش از ثبت سفارش
            </span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
            <ScrollText className="h-5 w-5 text-blue-700" />
            فهرست مطالب
          </h2>
          <nav aria-label="فهرست قوانین" className="mt-4">
            <ul className="space-y-1.5">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-400 transition group-hover:text-blue-700" />
                        {section.title}
                      </span>
                      <ChevronLeft className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="space-y-5">
          <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950 md:p-5">
            <CircleAlert className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              شرایط اختصاصی درج‌شده در صفحه هر محصول، مانند نوع گارانتی، وضعیت
              کالای کارکرده یا شیوه تحویل محصول دیجیتال، همراه با این قوانین
              اعمال می‌شود. در صورت تعارض، قوانین لازم‌الاجرا بر هر شرط دیگری
              مقدم است.
            </p>
          </section>

          {rules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <section
                id={rule.id}
                key={rule.id}
                className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-blue-700">بخش {index + 1}</p>
                    <h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
                      {rule.title}
                    </h2>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm leading-8 text-slate-600 marker:text-blue-700 md:text-base [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pr-5">
                  {rule.content}
                </div>
              </section>
            );
          })}

          <section className="rounded-3xl bg-slate-900 p-6 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-8">
            <div>
              <h2 className="text-xl font-black md:text-2xl">
                درباره یکی از بندها سوال دارید؟
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                پیش از ثبت سفارش با تیم پشتیبانی در ارتباط باشید تا شرایط محصول
                یا شیوه ارسال برای شما شفاف شود.
              </p>
            </div>
            <Link
              href="/contact-us"
              className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-blue-50 md:mt-0"
            >
              تماس با پشتیبانی
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
