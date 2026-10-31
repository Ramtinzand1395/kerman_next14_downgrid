"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Filter,
  RotateCcw,
  Tags,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { categories } from "../../constants/categories";
import type { ProductTagFacet } from "@/types";
import { useProductNavigation } from "./ProductNavigation";

type FilterProductsProps = {
  tags: ProductTagFacet[];
};

const flatCategories = categories.flatMap((item) => [
  { name: item.name, slug: item.slug },
  ...item.subcategories.map((sub) => ({
    name: sub.name,
    slug: sub.slug,
  })),
]);

export default function FilterProducts({ tags }: FilterProductsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isPending, navigate } = useProductNavigation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openedGroup, setOpenedGroup] = useState<string | null>(null);
  const selectedCategory = searchParams.get("category") || "";
  const selectedTag = searchParams.get("tag") || "";

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const updateFilter = (key: "category" | "tag", value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("page", "1");
    navigate(`${pathname}?${params.toString()}`, "filter");
    setMobileOpen(false);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    ["category", "tag", "q", "page"].forEach((key) => params.delete(key));
    const queryString = params.toString();

    navigate(queryString ? `${pathname}?${queryString}` : pathname, "filter");
    setMobileOpen(false);
  };

  const normalizeCat = (val: string) =>
    decodeURIComponent(val || "").trim().toLowerCase().replace(/\s+/g, "-");

  const isCatActive = (slug: string) => {
    if (!selectedCategory || !slug) return false;
    return (
      selectedCategory === slug ||
      normalizeCat(selectedCategory) === normalizeCat(slug)
    );
  };

  const selectedLabel =
    flatCategories.find((item) => isCatActive(item.slug))?.name ||
    (normalizeCat(selectedCategory) === "gaming-wall-art" ||
    normalizeCat(selectedCategory) === "gaming-signs"
      ? "تابلو گیمینگ"
      : "همه محصولات");
  const selectedTagLabel =
    tags.find((item) => item.slug === selectedTag)?.name || selectedTag;
  const hasFilters = Boolean(
    selectedCategory || selectedTag || searchParams.get("q"),
  );

  const renderFilterBody = () => (
    <fieldset disabled={isPending} className="contents">
      <section>
        <h3 className="mb-3 text-xs font-bold text-gray-500">دسته‌بندی</h3>
        <button
          type="button"
          onClick={() => updateFilter("category", "")}
          className={`mb-3 w-full rounded-xl px-3 py-2.5 text-right text-sm font-medium transition-colors ${
            !selectedCategory
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          همه دسته‌بندی‌ها
        </button>

        <nav
          className="flex flex-col gap-2"
          aria-label="فیلتر دسته‌بندی محصولات"
        >
          {categories.map((cat) => {
            const isActiveParent = isCatActive(cat.slug);
            const hasActiveChild = cat.subcategories.some(
              (sub) => isCatActive(sub.slug),
            );
            const isExpanded =
              openedGroup === cat.slug || isActiveParent || hasActiveChild;

            return (
              <div
                key={cat.slug}
                className="rounded-xl border border-gray-100 p-2"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/category/${encodeURIComponent(cat.slug)}`}
                    className={`block flex-1 rounded-lg px-3 py-2 text-right text-sm font-semibold transition-colors ${
                      isActiveParent
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {cat.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenedGroup(isExpanded ? null : cat.slug)
                    }
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-blue-200 hover:text-blue-600"
                    aria-expanded={isExpanded}
                    aria-label={`نمایش زیر دسته‌های ${cat.name}`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <ul className="mt-2 space-y-1 pr-2">
                    {cat.subcategories.map((sub) => {
                      const isActive = isCatActive(sub.slug);
                      return (
                        <li key={sub.slug}>
                          <Link
                            href={`/category/${encodeURIComponent(sub.slug)}`}
                            className={`block w-full rounded-lg px-3 py-2 text-right text-sm transition-colors ${
                              isActive
                                ? "bg-blue-100 font-semibold text-blue-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {sub.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </section>

      <section className="mt-5 border-t border-gray-100 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Tags className="h-4 w-4 text-blue-600" /> برچسب‌ها
          </h3>
          {selectedTag && (
            <button
              type="button"
              onClick={() => updateFilter("tag", "")}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              حذف برچسب
            </button>
          )}
        </div>

        {tags.length ? (
          <div
            className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pl-1"
            aria-label="فیلتر بر اساس برچسب"
          >
            {tags.map((tag) => {
              const isActive = selectedTag === tag.slug;

              return (
                <button
                  key={tag._id || tag.slug}
                  type="button"
                  onClick={() => updateFilter("tag", isActive ? "" : tag.slug)}
                  aria-pressed={isActive}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-200"
                      : "bg-indigo-50/60 text-gray-700 hover:bg-indigo-100 hover:text-indigo-800"
                  }`}
                >
                  <span>{tag.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-gray-500"
                    }`}
                  >
                    {tag.count.toLocaleString("fa-IR")}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-xs leading-6 text-gray-500">
            برای این دسته‌بندی برچسبی ثبت نشده است.
          </p>
        )}
      </section>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          <RotateCcw className="h-4 w-4" /> پاک‌کردن همه فیلترها
        </button>
      )}
    </fieldset>
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:hidden">
        <div className="min-w-0 flex-1 text-xs text-gray-500">
          <span className="block">فیلتر فعال</span>
          <span className="mt-0.5 block truncate font-semibold text-gray-800">
            {selectedLabel}
            {selectedTagLabel ? `، ${selectedTagLabel}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          <Filter size={16} /> فیلتر
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="فیلتر محصولات"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن پنل فیلتر"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 z-10 h-full w-[82%] max-w-xs overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-gray-800">
                <Filter size={17} /> فیلتر محصولات
              </h2>
              <button
                type="button"
                title="بستن"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            {renderFilterBody()}
          </div>
        </div>
      )}

      <aside className="hidden h-fit w-72 shrink-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:sticky md:top-24 md:block">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-gray-800">
          <Filter size={17} /> فیلتر محصولات
        </h2>
        {renderFilterBody()}
      </aside>
    </>
  );
}
