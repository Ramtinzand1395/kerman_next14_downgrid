import { Metadata } from "next";
import { SlidersHorizontal, Tags, X } from "lucide-react";

import type { Product, ProductTagFacet } from "@/types";

import Cart from "../components/Cart";
import FilterProducts from "./components/FilterProducts";
import Pagination from "./components/Pagination";
import SortProducts from "./components/SortProducts";
import ProductsSearch from "./components/ProductsSearch";
import ProductArtSlider from "./components/ProductArtSlider";
import {
  ProductNavigationLink,
  ProductNavigationProvider,
} from "./components/ProductNavigation";
import { SITE_URL, toAbsoluteUrl } from "@/lib/site";
import { categories } from "../constants/categories";

export const metadata: Metadata = {
  title: "محصولات",
  description:
    "لیست کامل محصولات کرمان آتاری شامل کنسول، بازی و لوازم جانبی با امکان فیلتر و مرتب‌سازی سریع.",
  keywords: [
    "محصولات کرمان آتاری",
    "خرید بازی پلی استیشن",
    "خرید کنسول بازی",
    "لوازم جانبی گیمینگ",
    "قیمت PS5",
  ],
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "محصولات | کرمان آتاری",
    description:
      "مشاهده همه محصولات کرمان آتاری با فیلتر دسته‌بندی، مرتب‌سازی قیمت و دسترسی سریع به جزئیات هر کالا.",
    url: "/products",
    type: "website",
    locale: "fa_IR",
  },
};
async function getProducts(params: {
  category?: string;
  sort?: string;
  page?: string;
  q?: string;
  tag?: string;
}) {
  const url = new URL(`${SITE_URL}/api/products/all_products`);

  if (params.category) {
    url.searchParams.append("category", params.category);
  }

  if (params.sort) {
    url.searchParams.append("sort", params.sort);
  }

  if (params.page) {
    url.searchParams.append("page", params.page);
  }
  if (params.q) {
    url.searchParams.append("q", params.q);
  }
  if (params.tag) {
    url.searchParams.append("tag", params.tag);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error("خطا در دریافت محصولات");
  }

  return res.json();
}

type ProductsSearchParams = {
  category?: string;
  sort?: string;
  page?: string;
  q?: string;
  tag?: string;
};

function productsUrlWithout(
  searchParams: ProductsSearchParams,
  keys: Array<keyof ProductsSearchParams>,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  keys.forEach((key) => params.delete(key));
  params.set("page", "1");

  return `/products?${params.toString()}`;
}

function categoryLabel(slug?: string) {
  if (!slug) return "";

  const decoded = decodeURIComponent(slug).trim();
  const normalized = decoded.toLowerCase().replace(/\s+/g, "-");

  for (const category of categories) {
    if (
      category.slug === slug ||
      category.slug === decoded ||
      category.slug.toLowerCase().replace(/\s+/g, "-") === normalized ||
      category.name === slug ||
      category.name === decoded
    ) {
      return category.name;
    }
    const subcategory = category.subcategories.find(
      (item) =>
        item.slug === slug ||
        item.slug === decoded ||
        item.slug.toLowerCase().replace(/\s+/g, "-") === normalized ||
        item.name === slug ||
        item.name === decoded,
    );
    if (subcategory) return subcategory.name;
  }

  if (
    normalized === "gaming-wall-art" ||
    normalized === "gaming-signs" ||
    decoded === "تابلو گیمینگ"
  ) {
    return "تابلو گیمینگ";
  }

  return slug;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: ProductsSearchParams;
}) {
  const data = await getProducts(searchParams);
  const products = data.products as Product[];
  const returnedTags = (data.filters?.tags || []) as ProductTagFacet[];
  const selectedTag = data.filters?.selectedTag as
    | Omit<ProductTagFacet, "count">
    | undefined;
  const availableTags =
    selectedTag && !returnedTags.some((tag) => tag.slug === selectedTag.slug)
      ? [{ ...selectedTag, count: data.total || 0 }, ...returnedTags]
      : returnedTags;
  const selectedTagName =
    selectedTag?.name ||
    availableTags.find((tag) => tag.slug === searchParams.tag)?.name ||
    searchParams.tag ||
    "";
  const selectedCategoryName = categoryLabel(searchParams.category);
  const totalPages = Math.ceil(data.total / data.limit);
  const currentPage = data.page;
  const hasActiveFilters = Boolean(
    searchParams.category || searchParams.tag || searchParams.q,
  );

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "محصولات کرمان آتاری",
    description:
      "لیست کامل محصولات کرمان آتاری شامل کنسول، بازی و لوازم جانبی با امکان فیلتر و مرتب‌سازی.",
    url: toAbsoluteUrl("/products"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.title,
        url: toAbsoluteUrl(`/product/${product.slug}`),
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "خانه",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "محصولات",
          item: toAbsoluteUrl("/products"),
        },
      ],
    },
  };

  return (
    <section className="mx-auto my-6 w-full max-w-[1440px] px-4 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />

      <ProductNavigationProvider>

      <ProductArtSlider />

      <header className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        <h1 className="mb-3 text-xl font-extrabold text-slate-900 md:text-2xl">
          {selectedTagName
            ? `محصولات با برچسب ${selectedTagName}`
            : selectedCategoryName
              ? `خرید ${selectedCategoryName}`
              : "همه محصولات فروشگاه"}
        </h1>
        <ProductsSearch
          key={searchParams.q || "all-products"}
          initialQuery={searchParams.q || ""}
        />
      </header>

      <SortProducts totalProducts={data.total || 0} />

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <span className="ml-1 text-xs font-bold text-blue-900">
            فیلترهای فعال:
          </span>

          {searchParams.category && (
            <ProductNavigationLink
              href={productsUrlWithout(searchParams, ["category"])}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:border-blue-300"
            >
              {selectedCategoryName} <X className="h-3.5 w-3.5" />
            </ProductNavigationLink>
          )}

          {searchParams.tag && (
            <ProductNavigationLink
              href={productsUrlWithout(searchParams, ["tag"])}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 transition hover:border-indigo-300"
            >
              <Tags className="h-3.5 w-3.5" /> {selectedTagName}
              <X className="h-3.5 w-3.5" />
            </ProductNavigationLink>
          )}

          {searchParams.q && (
            <ProductNavigationLink
              href={productsUrlWithout(searchParams, ["q"])}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:border-blue-300"
            >
              جستجو: «{searchParams.q}» <X className="h-3.5 w-3.5" />
            </ProductNavigationLink>
          )}

          <ProductNavigationLink
            href={productsUrlWithout(searchParams, ["category", "tag", "q"])}
            scroll={false}
            className="mr-auto text-xs font-bold text-red-600 transition hover:text-red-700"
          >
            پاک‌کردن همه
          </ProductNavigationLink>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
        <FilterProducts tags={availableTags} />

        <div className="w-full">
          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((game: Product) => (
                <Cart key={game._id} game={game} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-gray-800">
                محصولی با این ترکیب فیلتر پیدا نشد
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-gray-500">
                برچسب یا دسته‌بندی دیگری را امتحان کنید، یا همه فیلترها را پاک
                کنید تا محصولات بیشتری نمایش داده شود.
              </p>
              {hasActiveFilters && (
                <ProductNavigationLink
                  href={productsUrlWithout(searchParams, ["category", "tag", "q"])}
                  scroll={false}
                  className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  نمایش همه محصولات
                </ProductNavigationLink>
              )}
            </div>
          )}

          <Pagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      </div>

      <article className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-gray-800 md:text-xl">
          راهنمای خرید سریع
        </h2>
        <p className="mt-2 text-sm leading-7 text-gray-600">
          برای رسیدن به نتیجه بهتر، ابتدا دسته‌بندی را انتخاب کنید و سپس با
          برچسب‌هایی مثل سبک بازی یا پلتفرم، نتایج را دقیق‌تر کنید. مرتب‌سازی و
          عبارت جستجو هم‌زمان با این فیلترها کار می‌کنند و با هر تغییر، صفحه از
          ابتدا نمایش داده می‌شود.
        </p>
      </article>
      </ProductNavigationProvider>
    </section>
  );
}
