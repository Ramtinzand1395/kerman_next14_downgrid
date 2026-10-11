"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, PackageSearch } from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import type { LandingProductTab } from "@/lib/landing-data";
import type { Product } from "@/types";

type CatalogVariant = "games" | "equipment";

function platformLabel(product: Product) {
  const slugs = new Set((product.tags || []).map((tag) => tag.slug));
  if (slugs.has("ps5") || slugs.has("ps5-game")) return "PS5";
  if (slugs.has("ps4") || slugs.has("ps4-game")) return "PS4";
  if (slugs.has("xbox") || slugs.has("xbox-game")) return "Xbox";
  return product.category?.name || "بازی";
}

function ProductCard({
  product,
  variant,
}: {
  product: Product;
  variant: CatalogVariant;
}) {
  const isGame = variant === "games";

  return (
    <article className="group flex min-w-0 flex-col rounded-xl border border-[#e2ebfb] bg-white p-2 shadow-[0_6px_18px_rgba(15,61,130,0.06)] sm:p-3">
      <Link
        href={"/product/" + product.slug}
        className={
          "relative block overflow-hidden rounded-lg bg-[#f7f9fd] " +
          (isGame ? "aspect-[3/4]" : "aspect-[4/3]")
        }
        aria-label={"مشاهده " + product.title}
      >
        <ProductImage
          src={product.mainImage}
          alt={product.mainImageAlt || product.title}
          width={isGame ? 320 : 420}
          height={isGame ? 430 : 315}
          loading="lazy"
          sizes={
            isGame
              ? "(max-width: 639px) 46vw, 16vw"
              : "(max-width: 639px) 46vw, 24vw"
          }
          className={
            "h-full w-full  transition duration-300 group-hover:scale-[1.03] " +
            (isGame ? "object-cover" : "object-contain p-1")
          }
        />
      </Link>
      <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#0b1d48] sm:text-base">
        {product.title}
      </h3>
      {isGame && (
        <span className="mt-1 w-fit rounded-md bg-[#edf4ff] px-2 py-1 text-xs font-black text-[#1769ff]">
          {platformLabel(product)}
        </span>
      )}
      <Link
        href={"/product/" + product.slug}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#bcd4ff] px-3 text-xs font-black text-[#1262e7] transition hover:bg-[#edf4ff] focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
      >
        {isGame ? "مشاهده بازی" : "مشاهده قیمت"}
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function LandingCatalog({
  title,
  description,
  tabs,
  variant,
}: {
  title: string;
  description: string;
  tabs: LandingProductTab[];
  variant: CatalogVariant;
}) {
  const firstPopulated = tabs.find((tab) => tab.products.length > 0);
  const [activeId, setActiveId] = useState(firstPopulated?.id || tabs[0]?.id);
  const activeTab =
    tabs.find((tab) => tab.id === activeId) || firstPopulated || tabs[0];
  const products = activeTab?.products || [];
  const densityClass =
    products.length <= 1
      ? "mx-auto grid-cols-1 max-w-[220px] lg:max-w-[280px]"
      : products.length === 2
        ? "mx-auto grid-cols-2 max-w-[760px]"
        : products.length === 3
          ? "mx-auto grid-cols-2 sm:grid-cols-3 max-w-[980px]"
          : variant === "games"
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            : "grid-cols-2 sm:grid-cols-4";

  return (
    <section className="landing-panel" aria-labelledby={variant + "-heading"}>
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-end sm:justify-between sm:px-5 sm:pt-5">
        <div className="sm:order-1">
          <h2
            id={variant + "-heading"}
            className="text-xl font-black leading-tight text-[#0b1d48] sm:text-2xl lg:text-[28px]"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
        <div
          className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-[#f4f7fc] p-1.5 sm:order-2"
          role="tablist"
          aria-label={"فیلتر " + title}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab?.id === tab.id}
              aria-controls={variant + "-catalog-panel"}
              onClick={() => setActiveId(tab.id)}
              className={
                "min-h-11 shrink-0 rounded-lg px-4 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm " +
                (activeTab?.id === tab.id
                  ? "bg-[#1469f5] text-white shadow-sm"
                  : "text-slate-500 hover:bg-white")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id={variant + "-catalog-panel"}
        role="tabpanel"
        className="p-4 pt-3 sm:p-5 sm:pt-4"
      >
        {products.length > 0 ? (
          <div
            className={"grid w-full gap-3 sm:gap-4 " + densityClass}
          >
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                variant={variant}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-5 text-center">
            <PackageSearch
              className="h-7 w-7 text-blue-500"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-bold text-slate-600">
              هنوز محصول منتشرشده‌ای برای این فیلتر ثبت نشده است.
            </p>
          </div>
        )}
        {activeTab && (
          <Link
            href={activeTab.href}
            className="mx-auto mt-3 flex min-h-10 w-fit items-center gap-1 px-3 text-sm font-black text-[#1262e7] hover:underline"
          >
            مشاهده همه
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
