import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ClipboardCheck,
  Gamepad2,
  Image as ImageIcon,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import Link from "@/app/components/navigation/NavigationFeedback";
import ProductImage from "@/app/components/ProductImage";
import Cart from "../components/Cart";
import { getCategoryCatalog, getCategoryProducts, PAGE_SIZE } from "@/lib/catalog/category-data";
import { parseCatalogQuery } from "@/lib/catalog/category-seo";
import { isConsoleGeneration } from "@/lib/used-console";
import { toAbsoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
const path = "/used-consoles";
type Params = Record<string, string | string[] | undefined>;

const title = "خرید کنسول کارکرده PS2 تا PS5 در کرمان";
const description =
  "قیمت و موجودی کنسول‌های کارکرده پلی‌استیشن ۲، ۳، ۴ و ۵ را در کرمان آتاری ببینید؛ عکس همان دستگاه، وضعیت ظاهری، لوازم همراه و گزارش تست را پیش از خرید بررسی کنید.";

const families = [
  { label: "PS2", slug: "playstation-2", caption: "برای بازی‌های خاطره‌انگیز" },
  { label: "PS3", slug: "playstation-3", caption: "تنوع بازی‌های نسل هفتم" },
  { label: "PS4", slug: "playstation-4", caption: "آرشیو گسترده بازی‌ها" },
  { label: "PS5", slug: "playstation-5", caption: "تجربه نسل جدید" },
] as const;

const shoppingSteps = [
  { title: "عکس همان دستگاه", text: "ظاهر دستگاه و تصاویر ثبت‌شده را ببین؛ هر کنسول کارکرده وضعیت مخصوص به خودش را دارد.", icon: ImageIcon },
  { title: "گزارش بررسی", text: "نتیجه تست بخش‌های مختلف، ایرادهای اعلام‌شده و سابقه تعمیر درج‌شده را بخوان.", icon: ClipboardCheck },
  { title: "لوازم و شرایط خرید", text: "مدل، ظرفیت، وسایل همراه، قیمت و شرایط مهلت تست درج‌شده برای همان محصول را مقایسه کن.", icon: PackageCheck },
];

const faqs = [
  {
    question: "پیش از خرید کنسول کارکرده چه چیزهایی را بررسی کنم؟",
    answer: "مدل دقیق و ظرفیت، وضعیت ظاهری، نتیجه تست بخش‌های مختلف، سابقه تعمیر یا سرویس، لوازم همراه و شرایط مهلت تست را در صفحه همان دستگاه بررسی کن. این جزئیات ممکن است برای هر محصول متفاوت باشند.",
  },
  {
    question: "کنسول‌های PS2، PS3، PS4 و PS5 کارکرده چه تفاوتی دارند؟",
    answer: "هر نسل، بازی‌ها و امکانات متفاوتی دارد. پیش از انتخاب، بازی‌های موردعلاقه، بودجه، نوع دسته و فضای موردنیازت را مشخص کن و سپس مشخصات دستگاه‌های موجود را با هم مقایسه کن.",
  },
  {
    question: "آیا قیمت و موجودی کنسول‌های کارکرده ثابت است؟",
    answer: "خیر. قیمت هر دستگاه می‌تواند با توجه به مدل، ظرفیت، وضعیت ظاهری، لوازم همراه و نتایج بررسی متفاوت باشد. موجودی هم به دستگاه‌های منتشرشده و آماده فروش بستگی دارد.",
  },
  {
    question: "گزارش تست و مهلت تست هر دستگاه را کجا ببینم؟",
    answer: "وارد صفحه محصول کنسول موردنظر شو؛ گزارش بررسی دستگاه و شرایط ثبت‌شده برای همان محصول را مطالعه کن. اگر موردی برای تصمیم‌گیری‌ات روشن نبود، قبل از ثبت سفارش از فروشگاه سؤال کن.",
  },
];

function price(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,15}$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

const loadCollection = cache(async (serialized: string) => {
  const raw: Params = JSON.parse(serialized);
  const query = parseCatalogQuery({ page: raw.page, inStock: raw.inStock });
  const rows = await getCategoryCatalog();
  const generations = rows.filter((row) => isConsoleGeneration(row.slug));
  const selected = isConsoleGeneration(raw.generation) ? raw.generation : "";
  const category = selected ? generations.find((row) => row.slug === selected) : null;
  const categoryIds = selected
    ? (category ? [category._id] : [])
    : generations.map((row) => row._id);
  const range = { min: price(raw.min), max: price(raw.max) };
  const listing = categoryIds.length
    ? await getCategoryProducts(categoryIds, rows, { ...query, used: true }, range)
    : { total: 0, products: [] };
  const pages = Math.ceil(listing.total / PAGE_SIZE);
  if (query.page > Math.max(1, pages)) notFound();
  return { query, selected, generations, range, listing, pages };
});

function hasFilter(searchParams: Params) {
  return Object.keys(searchParams).some((key) => key !== "page" && Boolean(searchParams[key]));
}

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const { listing, query } = await loadCollection(JSON.stringify(searchParams));
  const filtered = hasFilter(searchParams);
  const canonical = !filtered && query.page > 1 ? path + "?page=" + query.page : path;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: listing.total > 0 && !filtered, follow: true },
    keywords: [
      "خرید کنسول کارکرده", "کنسول دست دوم در کرمان",
      "پلی استیشن 2 کارکرده", "پلی استیشن 3 کارکرده",
      "پلی استیشن 4 کارکرده", "پلی استیشن 5 کارکرده",
    ],
    openGraph: { title, description, url: toAbsoluteUrl(canonical), type: "website", locale: "fa_IR" },
    twitter: { card: "summary", title, description },
  };
}

export default async function UsedConsoles({ searchParams }: { searchParams: Params }) {
  const { query, selected, generations, range, listing, pages } = await loadCollection(JSON.stringify(searchParams));
  const filtered = hasFilter(searchParams);
  const filterOpen = range.min !== undefined || range.max !== undefined || query.inStock;
  const featured = listing.products[0];
  const formatCount = (value: number) => value.toLocaleString("fa-IR");
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (selected) params.set("generation", selected);
    if (range.min !== undefined) params.set("min", String(range.min));
    if (range.max !== undefined) params.set("max", String(range.max));
    if (query.inStock) params.set("inStock", "1");
    if (page > 1) params.set("page", String(page));
    return params.size ? path + "?" + params : path;
  };
  const control = "mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const collectionSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        inLanguage: "fa-IR",
        url: toAbsoluteUrl(path),
        isPartOf: { "@type": "WebSite", name: "کرمان آتاری", url: toAbsoluteUrl("/") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: toAbsoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "کنسول‌های کارکرده", item: toAbsoluteUrl(path) },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: listing.total,
        itemListElement: listing.products.map((product, index) => ({
          "@type": "ListItem",
          position: (query.page - 1) * PAGE_SIZE + index + 1,
          name: product.title,
          url: toAbsoluteUrl("/product/" + product.slug),
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] pb-24 text-[#132446] sm:pb-16" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-[1280px] space-y-7 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
          <Link href="/" className="transition hover:text-blue-700">صفحه اصلی</Link>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page" className="font-bold text-[#12376e]">کنسول‌های کارکرده</span>
        </nav>

        <header className="relative isolate overflow-hidden rounded-[28px] bg-[#0b1733] text-white shadow-[0_20px_55px_rgba(15,36,80,0.16)] sm:rounded-[34px]">
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-[300px] w-[300px] rounded-full bg-blue-500/25 blur-[95px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-0 h-[320px] w-[320px] rounded-full bg-sky-400/10 blur-[85px]" />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-blue-100">
                <ShieldCheck className="h-4 w-4 text-sky-300" aria-hidden="true" />
                راهنمای خرید مطمئن‌تر پلی‌استیشن کارکرده
              </span>
              <h1 className="mt-5 max-w-2xl text-[26px] font-black leading-[1.65] tracking-tight sm:text-4xl lg:text-[40px]">
                خرید کنسول کارکرده
                <span className="block text-[#94c9ff]">PS2 تا PS5 در کرمان</span>
              </h1>
              <p className="mt-4 max-w-[620px] text-sm leading-8 text-slate-200 sm:text-base">
                برای انتخاب کنسول دست‌دوم، فقط قیمت مهم نیست. در کرمان آتاری می‌توانی
                عکس همان دستگاه، مدل و ظرفیت، شرایط ظاهری، لوازم همراه و گزارش بررسی
                ثبت‌شده را کنار هم ببینی و بعد تصمیم بگیری.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="نکات مهم در خرید کنسول کارکرده">
                {["عکس واقعی", "گزارش تست دستگاه", "جزئیات لوازم همراه", "قیمت هر دستگاه"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[11px] font-bold text-blue-50 sm:text-xs">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
              <a href="#console-results" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2475f6] px-5 text-sm font-black text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-fit">
                مشاهده دستگاه‌های موجود <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="relative min-h-[225px] overflow-hidden rounded-[22px] border border-white/15 bg-[radial-gradient(circle_at_50%_20%,#26559a_0%,#152c54_48%,#0b1b38_100%)] p-4 sm:min-h-[300px] sm:p-6">
              <div aria-hidden="true" className="absolute -left-8 -top-8 h-40 w-40 rounded-full border border-white/15" />
              <div aria-hidden="true" className="absolute -right-16 -bottom-20 h-60 w-60 rounded-full border border-white/10" />
              {featured ? (
                <Link href={"/product/" + featured.slug} className="relative flex h-full min-h-[200px] items-center gap-4">
                  <div className="relative aspect-square w-[55%] shrink-0 overflow-hidden rounded-2xl bg-white/95 p-2 shadow-[0_24px_55px_rgba(0,0,0,0.24)]">
                    <ProductImage src={featured.mainImage} alt={featured.mainImageAlt || featured.title}
                      width={350} height={350} loading="lazy" sizes="(max-width: 640px) 48vw, 260px"
                      className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block rounded-lg bg-cyan-300/15 px-2 py-1 text-[11px] font-bold text-cyan-200">از کنسول‌های ثبت‌شده در فروشگاه</span>
                    <p className="mt-3 line-clamp-3 text-sm font-black leading-7 text-white sm:text-base">{featured.title}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-200">
                      مشاهده جزئیات <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="relative flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
                  <span className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/20 bg-white/10 shadow-xl">
                    <Gamepad2 className="h-12 w-12 text-[#bde1ff]" strokeWidth={1.4} aria-hidden="true" />
                  </span>
                  <p className="text-lg font-black text-blue-50">از خاطره تا نسل جدید</p>
                  <div className="grid w-full max-w-[300px] grid-cols-4 gap-2" dir="ltr">
                    {families.map((item) => <span key={item.slug} className="rounded-lg border border-white/15 bg-white/10 py-2 text-xs font-black text-blue-100">{item.label}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section aria-labelledby="generation-heading" className="rounded-[24px] border border-[#e2e9f4] bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="generation-heading" className="text-lg font-black text-[#142b55] sm:text-xl">کدام نسل پلی‌استیشن را می‌خواهی؟</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">یک نسل را انتخاب کن تا فقط دستگاه‌های کارکرده همان گروه را ببینی.</p>
            </div>
            {selected && <Link href={path} className="text-xs font-bold text-blue-700 hover:underline">نمایش همه نسل‌ها</Link>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {families.map((item) => {
              const active = selected === item.slug;
              return (
                <Link
                  key={item.slug}
                  href={active ? path : path + "?generation=" + item.slug}
                  aria-current={active ? "page" : undefined}
                  className={"group flex min-h-[84px] flex-col items-start justify-center rounded-2xl border px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 " +
                    (active ? "border-blue-600 bg-[#175fe4] text-white shadow-[0_9px_24px_rgba(30,94,218,0.16)]" : "border-[#e3eafa] bg-[#f7faff] text-[#152e5a] hover:border-blue-300 hover:bg-blue-50")}
                >
                  <span dir="ltr" className="text-lg font-black">{item.label}</span>
                  <span className={"mt-1 text-[11px] leading-5 " + (active ? "text-blue-100" : "text-slate-500")}>{item.caption}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="console-results" aria-labelledby="results-heading" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="results-heading" className="text-xl font-black text-[#142b55] sm:text-2xl">کنسول‌های کارکرده فروشگاه</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
                {formatCount(listing.total)} دستگاه مطابق انتخاب شما
                {selected && " · " + (generations.find((item) => item.slug === selected)?.name || families.find((item) => item.slug === selected)?.label)}
              </p>
            </div>
            {filtered && <Link href={path} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-50">پاک کردن فیلترها</Link>}
          </div>

          <details open={filterOpen} className="group rounded-[22px] border border-[#e0e8f5] bg-white shadow-sm">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-[#17315f] marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2 text-sm">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" aria-hidden="true" />
                فیلتر قیمت و موجودی
                {filtered && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">فعال</span>}
              </span>
              <ChevronLeft className="h-4 w-4 text-blue-600 transition-transform group-open:-rotate-90" aria-hidden="true" />
            </summary>
            <form action={path} method="get" className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-5 lg:items-end">
              <label className="text-xs font-bold text-slate-700">نسل دستگاه
                <select name="generation" defaultValue={selected} className={control}>
                  <option value="">همه نسل‌ها</option>
                  {generations.map((row) => <option key={row._id} value={row.slug}>{row.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">حداقل قیمت (تومان)
                <input type="number" min="0" inputMode="numeric" name="min" defaultValue={range.min} placeholder="بدون محدودیت" className={control} />
              </label>
              <label className="text-xs font-bold text-slate-700">حداکثر قیمت (تومان)
                <input type="number" min="0" inputMode="numeric" name="max" defaultValue={range.max} placeholder="بدون محدودیت" className={control} />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-700">
                <input type="checkbox" name="inStock" value="1" defaultChecked={query.inStock} className="h-4 w-4 accent-blue-600" />
                فقط دستگاه‌های موجود
              </label>
              <button type="submit" className="min-h-11 rounded-xl bg-[#2169ed] px-5 text-sm font-black text-white shadow-[0_6px_16px_rgba(23,90,216,0.12)] transition hover:bg-blue-700">
                نمایش نتایج
              </button>
            </form>
          </details>

          {listing.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {listing.products.map((product) => <Cart key={product._id} game={product} />)}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#b7cbed] bg-white px-5 py-12 text-center">
              <Gamepad2 className="mx-auto h-12 w-12 text-blue-300" strokeWidth={1.4} aria-hidden="true" />
              <h3 className="mt-4 text-lg font-black text-[#1d3765]">فعلاً دستگاهی مطابق این انتخاب پیدا نشد</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
                ممکن است موجودی این نسل یا بازه قیمتی تغییر کرده باشد. فیلترها را بردار یا نسل دیگری را بررسی کن.
              </p>
              <Link href={path} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2169ed] px-6 text-sm font-black text-white hover:bg-blue-700">
                مشاهده همه کنسول‌های کارکرده
              </Link>
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="صفحه‌بندی کنسول‌های کارکرده" className="flex flex-wrap items-center justify-center gap-3 py-4 text-sm">
              {query.page > 1 && <Link href={href(query.page - 1)} className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-bold text-blue-700 hover:bg-blue-50">صفحه قبل</Link>}
              <span className="px-2 font-bold text-slate-600">صفحه {formatCount(query.page)} از {formatCount(pages)}</span>
              {query.page < pages && <Link href={href(query.page + 1)} className="rounded-xl border border-blue-100 bg-white px-4 py-2 font-bold text-blue-700 hover:bg-blue-50">صفحه بعد</Link>}
            </nav>
          )}
        </section>

        <section aria-labelledby="shopping-guide" className="rounded-[26px] border border-[#dde7f5] bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-black text-blue-700">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> قبل از ثبت سفارش
            </span>
            <h2 id="shopping-guide" className="mt-2 text-xl font-black leading-9 text-[#142b55] sm:text-2xl">
              کنسول کارکرده خوب را با اطلاعاتش انتخاب کن، نه فقط ظاهرش
            </h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              موقع خرید پلی‌استیشن دست‌دوم، دو دستگاه از یک نسل هم ممکن است شرایط متفاوتی داشته باشند.
              بهتر است مشخصات فنی، وضعیت دستگاه و اطلاعات درج‌شده برای همان محصول را با نیاز و بودجه خودت مقایسه کنی.
            </p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {shoppingSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl border border-[#e2eafa] bg-[#f8fbff] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f0ff] text-blue-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="text-xs font-black text-blue-300" aria-hidden="true">۰{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-black text-[#163466]">{step.title}</h3>
                  <p className="mt-2 text-xs leading-7 text-slate-600 sm:text-sm">{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="rounded-[26px] border border-[#dde7f5] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-5">
            <h2 id="faq-heading" className="text-xl font-black text-[#142b55] sm:text-2xl">سؤال‌های رایج درباره خرید کنسول کارکرده</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">پاسخ‌هایی برای مقایسه دقیق‌تر دستگاه‌ها، قبل از خرید.</p>
          </div>
          <div className="divide-y divide-[#e6ecf5]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-black leading-7 text-[#183765] marker:hidden sm:text-base [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-blue-600 transition-transform group-open:-rotate-90" aria-hidden="true" />
                </summary>
                <p className="mt-3 max-w-4xl text-sm leading-8 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
