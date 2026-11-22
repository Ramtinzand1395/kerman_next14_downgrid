import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/app/components/navigation/NavigationFeedback";
import Cart from "../components/Cart";
import { getCategoryCatalog, getCategoryProducts, PAGE_SIZE } from "@/lib/catalog/category-data";
import { parseCatalogQuery } from "@/lib/catalog/category-seo";
import { isConsoleGeneration } from "@/lib/used-console";

export const dynamic = "force-dynamic";
const path = "/used-consoles";
type Params = Record<string, string | string[] | undefined>;
const title = "خرید کنسول کارکرده در کرمان | پلی‌استیشن ۲ تا ۵";
const description = "کنسول‌های کارکردهٔ کرمان آتاری را با عکس همان دستگاه، گزارش تست، لوازم همراه و قیمت مقایسه کنید.";
function price(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,15}$/.test(value)) return undefined;
  return Number(value);
}

const loadCollection = cache(async (serialized: string) => {
  const raw: Params = JSON.parse(serialized);
  const query = parseCatalogQuery({ page: raw.page, inStock: raw.inStock });
  const rows = await getCategoryCatalog();
  const generations = rows.filter(row => isConsoleGeneration(row.slug));
  const selected = isConsoleGeneration(raw.generation) ? raw.generation : "";
  const category = selected ? generations.find(row => row.slug === selected) : null;
  // Always query the four PlayStation families, independent of parent category.
  // A parent "consoles" category is not required in the admin catalog.
  const categoryIds = category ? [category._id] : generations.map(row => row._id);
  const range = { min: price(raw.min), max: price(raw.max) };
  const listing = categoryIds.length
    ? await getCategoryProducts(categoryIds, rows, { ...query, used: true }, range)
    : { total: 0, products: [] };
  const pages = Math.ceil(listing.total / PAGE_SIZE);
  if (query.page > Math.max(1, pages)) notFound();
  return { query, selected, generations, range, listing, pages };
});

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const { listing, query } = await loadCollection(JSON.stringify(searchParams));
  const filtered = Object.keys(searchParams).some(key => key !== "page" && Boolean(searchParams[key]));
  const canonical = !filtered && query.page > 1 ? path + "?page=" + query.page : path;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: listing.total > 0 && !filtered, follow: true },
    openGraph: { title, description, url: canonical, type: "website", locale: "fa_IR" },
  };
}

export default async function UsedConsoles({ searchParams }: { searchParams: Params }) {
  const { query, selected, generations, range, listing, pages } = await loadCollection(JSON.stringify(searchParams));
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (selected) params.set("generation", selected);
    if (range.min !== undefined) params.set("min", String(range.min));
    if (range.max !== undefined) params.set("max", String(range.max));
    if (query.inStock) params.set("inStock", "1");
    if (page > 1) params.set("page", String(page));
    return params.size ? path + "?" + params : path;
  };
  const control = "mt-1 block w-full rounded-lg border p-2";
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
    <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <Link href="/" className="hover:text-blue-700">صفحه اصلی</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">کنسول‌های کارکرده</span>
    </nav>
    <header className="rounded-2xl bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold">خرید کنسول کارکرده در کرمان</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="نسل‌های پلی‌استیشن">
        {generations.map(row => <Link key={row._id} href={path + "?generation=" + row.slug}
          className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20">
          {row.name}
        </Link>)}
      </div>
    </header>
    <form action={path} method="get" className="grid items-end gap-3 rounded-xl border p-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
      <label>نسل دستگاه<select name="generation" defaultValue={selected} className={control}>
        <option value="">همهٔ نسل‌ها</option>
        {generations.map(row => <option key={row._id} value={row.slug}>{row.name}</option>)}
      </select></label>
      <label>از قیمت (تومان)<input type="number" min="0" name="min" defaultValue={range.min} className={control} /></label>
      <label>تا قیمت (تومان)<input type="number" min="0" name="max" defaultValue={range.max} className={control} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" name="inStock" value="1" defaultChecked={query.inStock} />فقط موجود</label>
      <button className="rounded-lg bg-blue-700 px-4 py-2 text-white">اعمال فیلتر</button>
    </form>
    <p className="text-xs leading-6 text-slate-600">
      فقط کنسول‌های کارکرده منتشرشده نمایش داده می‌شوند. گزارش تست و مشخصات هر دستگاه را در صفحه محصول بررسی کنید.
    </p>
    {listing.products.length > 0 ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {listing.products.map(product => <Cart key={product._id} game={product} />)}
    </div> : <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
      <p className="font-bold text-slate-800">در حال حاضر دستگاه کارکرده‌ای با این مشخصات منتشر نشده است.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
        <Link href={path} className="font-semibold text-blue-700 underline underline-offset-4">حذف فیلترها</Link>
        <Link href="/category/consoles" className="font-semibold text-blue-700 underline underline-offset-4">مشاهده همه کنسول‌ها</Link>
      </div>
    </div>}
    {pages > 1 && <nav aria-label="صفحه‌بندی" className="flex justify-center gap-6">
      {query.page > 1 && <Link href={href(query.page - 1)}>صفحهٔ قبل</Link>}
      <span>{query.page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
      {query.page < pages && <Link href={href(query.page + 1)}>صفحهٔ بعد</Link>}
    </nav>}
  </main>;
}
