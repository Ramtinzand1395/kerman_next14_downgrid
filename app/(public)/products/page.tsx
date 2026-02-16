import { Metadata } from "next";

import { Product } from "@/types";

import Cart from "../components/Cart";
import FilterProducts from "./components/FilterProducts";
import Pagination from "./components/Pagination";
import SortProducts from "./components/SortProducts";

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
    canonical: "https://kermanatari.ir/products",
  },
  openGraph: {
    title: "محصولات | کرمان آتاری",
    description:
      "مشاهده همه محصولات کرمان آتاری با فیلتر دسته‌بندی، مرتب‌سازی قیمت و دسترسی سریع به جزئیات هر کالا.",
    url: "https://kermanatari.ir/products",
    type: "website",
    locale: "fa_IR",
  },
};

async function getProducts(params: { category?: string; sort?: string; page?: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/products/all_products`);

  if (params.category) {
    url.searchParams.append("category", params.category);
  }

  if (params.sort) {
    url.searchParams.append("sort", params.sort);
  }

  if (params.page) {
    url.searchParams.append("page", params.page);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error("خطا در دریافت محصولات");
  }

  return res.json();
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const data = await getProducts(searchParams);
  const products = data.products as Product[];
  const totalPages = Math.ceil(data.total / data.limit);
  const currentPage = data.page;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "محصولات کرمان آتاری",
    description:
      "لیست کامل محصولات کرمان آتاری شامل کنسول، بازی و لوازم جانبی با امکان فیلتر و مرتب‌سازی.",
    url: "https://kermanatari.ir/products",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.title,
        url: `https://kermanatari.ir/product/${product.slug}`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "خانه",
          item: "https://kermanatari.ir",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "محصولات",
          item: "https://kermanatari.ir/products",
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

      <header className="mb-6 rounded-3xl bg-gradient-to-l from-blue-600 to-indigo-700 p-5 text-white shadow-lg md:p-8">
        <h1 className="text-2xl font-extrabold md:text-4xl">همه محصولات فروشگاه</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-blue-50 md:text-base">
          در این صفحه می‌توانید جدیدترین کنسول‌ها، بازی‌ها و لوازم جانبی را مشاهده
          کنید، فیلتر بگذارید و با سرعت بالا محصول مناسب خودتان را پیدا کنید.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:max-w-md sm:grid-cols-3 sm:text-sm">
          <div className="rounded-xl bg-white/15 px-3 py-2">ارسال سریع</div>
          <div className="rounded-xl bg-white/15 px-3 py-2">تضمین اصالت</div>
          <div className="rounded-xl bg-white/15 px-3 py-2">پشتیبانی تخصصی</div>
        </div>
      </header>

      <SortProducts totalProducts={data.total || 0} />

       <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
        <FilterProducts />

        <div className="w-full">
          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((game: Product) => (
                <Cart key={game._id} game={game} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
              محصولی مطابق فیلتر انتخابی پیدا نشد.
            </div>
          )}

          <Pagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      </div>

      <article className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-gray-800 md:text-xl">راهنمای خرید سریع</h2>
        <p className="mt-2 text-sm leading-7 text-gray-600">
          برای رسیدن به نتیجه بهتر، ابتدا دسته‌بندی محصول را انتخاب کنید و سپس با
          ابزار مرتب‌سازی، کالاها را بر اساس قیمت یا جدیدترین‌ها ببینید. این ساختار
          باعث می‌شود تجربه کاربری سریع‌تر و نرخ تبدیل بالاتر باشد.
        </p>
      </article>
    </section>
  );
}
