import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Cart from "../../components/Cart";
import { toAbsoluteUrl } from "@/lib/site";
import {
  getCategoryCatalog,
  getCategoryProducts,
  PAGE_SIZE,
} from "@/lib/catalog/category-data";
import {
  categoryAncestors,
  categoryCanonical,
  categoryContent,
  categoryHref,
  catalogQueryString,
  decodeCategorySlug,
  hasCatalogFilters,
  parseCatalogQuery,
} from "@/lib/catalog/category-seo";

export const dynamic = "force-dynamic";
type Props = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};
const getPage = cache(async (slug: string, serializedQuery: string) => {
  const decoded = decodeCategorySlug(slug);
  if (!decoded) notFound();
  const rows = await getCategoryCatalog();
  const category = rows.find((row) => row.slug === decoded);
  if (!category) notFound();
  const query = parseCatalogQuery(JSON.parse(serializedQuery));
  const listing = await getCategoryProducts(category._id, rows, query);
  const totalPages = Math.ceil(listing.total / PAGE_SIZE);
  if (query.page > Math.max(1, totalPages)) notFound();
  const ancestors = categoryAncestors(category, rows)!;
  return {
    rows,
    category,
    ancestors,
    query,
    listing,
    totalPages,
    content: categoryContent(category, ancestors),
  };
});
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { category, query, content } = await getPage(
    params.slug,
    JSON.stringify(searchParams),
  );
  const title =
    content.title +
    (query.page > 1 ? ` - صفحه ${query.page.toLocaleString("fa-IR")}` : "");
  const canonical = categoryCanonical(category, query);
  return {
    title,
    description: content.description,
    alternates: { canonical },
    robots: {
      index: category.productCount > 0 && !hasCatalogFilters(query),
      follow: true,
    },
    openGraph: {
      title: `${title} | کرمان آتاری`,
      description: content.description,
      url: canonical,
      locale: "fa_IR",
      type: "website",
    },
  };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const { category, rows, ancestors, query, listing, totalPages, content } =
    await getPage(params.slug, JSON.stringify(searchParams));
  const path = categoryHref(category.slug);
  if (
    searchParams.category ||
    decodeCategorySlug(params.slug) !== params.slug
  ) {
    const suffix = catalogQueryString(query);
    permanentRedirect(path + (suffix ? `?${suffix}` : ""));
  }
  const children = rows.filter((row) => row.parent === category._id);
  const siblings = rows.filter(
    (row) => row.parent === category.parent && row._id !== category._id,
  );
  const crumbs = [
    { name: "خانه", href: "/" },
    { name: "دسته‌بندی‌ها", href: "/categories" },
    ...ancestors.map((row) => ({
      name: row.name,
      href: categoryHref(row.slug),
    })),
    { name: category.name, href: path },
  ];
  const pageHref = (page: number) => {
    const suffix = catalogQueryString({ ...query, page });
    return path + (suffix ? `?${suffix}` : "");
  };
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: content.description,
    url: toAbsoluteUrl(categoryCanonical(category, query)),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: toAbsoluteUrl(crumb.href),
      })),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listing.products.length,
      itemListElement: listing.products.map((product, index) => ({
        "@type": "ListItem",
        position: (query.page - 1) * PAGE_SIZE + index + 1,
        name: product.title,
        url: toAbsoluteUrl(`/product/${product.slug}`),
      })),
    },
  };
  return (
    <section className="mx-auto my-6 max-w-[1440px] space-y-6 px-4 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <nav
        aria-label="مسیر راهنما"
        className="flex flex-wrap gap-2 text-sm text-slate-600"
      >
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === crumbs.length - 1 ? (
              <span aria-current="page">{crumb.name}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-blue-700">
                {crumb.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <header className="rounded-3xl bg-slate-900 p-6 text-white md:p-9">
        <p className="mb-2 text-sm text-blue-200">
          مجموعهٔ محصولات کرمان آتاری
        </p>
        <h1 className="text-2xl font-extrabold md:text-3xl">
          خرید {category.name}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200">
          {content.intro}
        </p>
        <p className="mt-4 text-xs text-blue-200">
          {category.productCount.toLocaleString("fa-IR")} محصول در این مجموعه
        </p>
      </header>
      {children.length > 0 && (
        <nav
          aria-label={`زیرمجموعه‌های ${category.name}`}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {children.map((child) => (
            <Link
              href={categoryHref(child.slug)}
              key={child._id}
              className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white p-4 font-semibold text-slate-800 hover:border-blue-400"
            >
              {child.name}
              <span className="text-xs text-slate-500">
                {child.productCount.toLocaleString("fa-IR")} محصول
              </span>
            </Link>
          ))}
        </nav>
      )}
      <form
        key={catalogQueryString(query)}
        action={path}
        method="get"
        aria-label="جستجو و فیلتر محصولات این دسته"
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="text-sm text-slate-700">
          جستجو در این مجموعه
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            maxLength={80}
            placeholder="نام محصول یا برند"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          برچسب
          <select
            name="tag"
            defaultValue={query.tag}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
          >
            <option value="">همه برچسب‌ها</option>
            {query.tag &&
              !listing.tags.some((tag) => tag.slug === query.tag) && (
                <option value={query.tag}>{query.tag}</option>
              )}
            {listing.tags.map((tag) => (
              <option value={tag.slug} key={tag._id}>
                {tag.name} ({tag.count.toLocaleString("fa-IR")})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          مرتب‌سازی
          <select
            name="sort"
            defaultValue={query.sort}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
          >
            <option value="newest">جدیدترین</option>
            <option value="lowPrice">کمترین قیمت</option>
            <option value="highPrice">بیشترین قیمت</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            name="inStock"
            type="checkbox"
            value="1"
            defaultChecked={query.inStock}
            className="h-4 w-4"
          />
          فقط محصولات موجود
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            اعمال فیلتر
          </button>
          {hasCatalogFilters(query) && (
            <Link href={path} className="text-sm text-blue-700">
              پاک‌کردن
            </Link>
          )}
        </div>
      </form>
      <div id="category-products" className="scroll-mt-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            محصولات {category.name}
          </h2>
          <span role="status" className="text-sm text-slate-600">
            {listing.total.toLocaleString("fa-IR")} نتیجه
          </span>
        </div>
        {listing.products.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {listing.products.map((product) => (
              <Cart key={product._id} game={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-800">
              {hasCatalogFilters(query)
                ? "محصولی با این فیلترها پیدا نشد."
                : "در حال حاضر محصولی در این مجموعه منتشر نشده است."}
            </p>
            <Link
              href={hasCatalogFilters(query) ? path : "/categories"}
              className="mt-4 inline-block text-sm text-blue-700"
            >
              {hasCatalogFilters(query)
                ? "حذف فیلترها"
                : "مشاهده دسته‌بندی‌های دیگر"}
            </Link>
          </div>
        )}
        {totalPages > 1 && (
          <nav
            aria-label="صفحه‌بندی محصولات"
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {query.page > 1 && (
              <Link
                href={pageHref(query.page - 1)}
                className="rounded-xl border bg-white p-3 text-sm"
              >
                قبلی
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - query.page) <= 1,
              )
              .map((page, index, pages) => (
                <span key={page} className="flex items-center gap-2">
                  {index > 0 && page - pages[index - 1] > 1 && <span>…</span>}
                  <Link
                    href={pageHref(page)}
                    aria-current={page === query.page ? "page" : undefined}
                    className={`rounded-xl border px-4 py-3 text-sm ${page === query.page ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                  >
                    {page.toLocaleString("fa-IR")}
                  </Link>
                </span>
              ))}
            {query.page < totalPages && (
              <Link
                href={pageHref(query.page + 1)}
                className="rounded-xl border bg-white p-3 text-sm"
              >
                بعدی
              </Link>
            )}
          </nav>
        )}
      </div>
      <article className="rounded-2xl border border-slate-100 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">
          راهنمای خرید {category.name}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-8 text-slate-600">
          {content.guide}
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-blue-700">
          <Link href="/terms">شرایط خرید و مرجوعی</Link>
          <Link href="/contact-us">مشاوره و تماس با فروشگاه</Link>
          {[category.slug, ...ancestors.map((row) => row.slug)].includes(
            "consoles",
          ) && (
            <>
              <Link href="/guides/ps5-buying-guide">راهنمای خرید PS5</Link>
              <Link href="/guides/ps4-buying-guide">راهنمای خرید PS4</Link>
            </>
          )}
        </div>
        <h2 className="mb-3 mt-7 text-lg font-bold text-slate-900">
          پرسش‌های متداول {category.name}
        </h2>
        {content.faqs.map((faq) => (
          <details
            key={faq.question}
            className="border-b border-slate-100 py-4"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {faq.answer}
            </p>
          </details>
        ))}
      </article>
      {siblings.length > 0 && (
        <nav aria-label="دسته‌بندی‌های مرتبط" className="flex flex-wrap gap-3">
          <span className="text-sm font-bold text-slate-700">
            دسته‌بندی‌های مرتبط:
          </span>
          {siblings.map((row) => (
            <Link
              href={categoryHref(row.slug)}
              key={row._id}
              className="text-sm text-blue-700 hover:underline"
            >
              {row.name}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
