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
  const category = rows.find(row => row.slug === (selected || "consoles"));
  const range = { min: price(raw.min), max: price(raw.max) };
  const listing = category
    ? await getCategoryProducts(category._id, rows, { ...query, used: true }, range)
    : { total: 0, products: [] };
  const pages = Math.ceil(listing.total / PAGE_SIZE);
  if (query.page > Math.max(1, pages)) notFound();
  return { query, selected, generations, range, listing, pages };
});

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const { listing, query } = await loadCollection(JSON.stringify(searchParams));
  const filtered = Object.keys(searchParams).some(key => key !== "page" && Boolean(searchParams[key]));
  const canonical = !filtered && query.page > 1 ? path + "?page=" + query.page : path;
  return { title, description, alternates: { canonical }, robots: { index: listing.total > 0 && !filtered, follow: true } };
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
    <header className="rounded-2xl bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold">خرید کنسول کارکرده در کرمان</h1>
      <p className="mt-3 text-sm">{description}</p>
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
    {listing.products.length > 0 ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {listing.products.map(product => <Cart key={product._id} game={product} />)}
    </div> : <p>دستگاهی با این مشخصات برای نمایش وجود ندارد. <Link href="/category/consoles" className="text-blue-700">مشاهدهٔ همهٔ کنسول‌ها</Link></p>}
    {pages > 1 && <nav aria-label="صفحه‌بندی" className="flex justify-center gap-6">
      {query.page > 1 && <Link href={href(query.page - 1)}>صفحهٔ قبل</Link>}
      <span>{query.page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
      {query.page < pages && <Link href={href(query.page + 1)}>صفحهٔ بعد</Link>}
    </nav>}
  </main>;
}
