import Link from "next/link";
import type { Metadata } from "next";
import { getCategoryCatalog } from "@/lib/catalog/category-data";
import { categoryHref } from "@/lib/catalog/category-seo";
import { toAbsoluteUrl } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دسته‌بندی محصولات",
  description:
    "دسته‌بندی‌ها و زیرمجموعه‌های محصولات کرمان آتاری؛ کنسول، بازی، تابلو گیمینگ و لوازم جانبی را بررسی کنید.",
  alternates: { canonical: "/categories" },
};
export default async function CategoriesPage() {
  const rows = await getCategoryCatalog();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "دسته‌بندی محصولات کرمان آتاری",
    url: toAbsoluteUrl("/categories"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: rows.map((row, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: row.name,
        url: toAbsoluteUrl(categoryHref(row.slug)),
      })),
    },
  };
  const renderChildren = (id: string): React.ReactNode => {
    const children = rows.filter((row) => row.parent === id);
    return children.length ? (
      <ul className="mt-3 space-y-3 border-r border-slate-200 pr-4">
        {children.map((child) => (
          <li key={child._id}>
            <Link
              href={categoryHref(child.slug)}
              className="text-sm text-blue-700 hover:underline"
            >
              {child.name}{" "}
              <span className="text-xs text-slate-500">
                ({child.productCount.toLocaleString("fa-IR")})
              </span>
            </Link>
            {renderChildren(child._id)}
          </li>
        ))}
      </ul>
    ) : null;
  };
  return (
    <section className="mx-auto my-8 max-w-6xl px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <h1 className="text-2xl font-extrabold text-slate-900">
        دسته‌بندی محصولات
      </h1>
      <p className="my-4 text-sm leading-7 text-slate-600">
        برای بررسی محصولات و مقایسهٔ گزینه‌ها، مجموعهٔ مورد نظرتان را انتخاب
        کنید. همهٔ دسته‌ها و زیرمجموعه‌های فروشگاه در این صفحه در دسترس‌اند.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows
          .filter((row) => !row.parent)
          .map((root) => (
            <article
              key={root._id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h2 className="font-bold text-slate-900">
                <Link href={categoryHref(root.slug)}>{root.name}</Link>
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                {root.productCount.toLocaleString("fa-IR")} محصول
              </p>
              {renderChildren(root._id)}
            </article>
          ))}
      </div>
      <Link
        href="/products"
        className="mt-8 inline-block text-sm font-semibold text-blue-700"
      >
        مشاهده همه محصولات
      </Link>
    </section>
  );
}
