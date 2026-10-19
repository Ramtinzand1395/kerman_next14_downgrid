"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

import type { Category, ProductForm } from "@/types";

interface CategorySelectorProps {
  form: ProductForm;
  categories: Category[];
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const normalizeSearch = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("fa-IR")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک");

const categoryLabel = (category: Category) =>
  category.parent ? `${category.parent.name} / ${category.name}` : category.name;

const CategorySelector = ({
  form,
  categories,
  updateField,
}: CategorySelectorProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category._id === form.category),
    [categories, form.category],
  );

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return [];

    return categories
      .filter((category) =>
        normalizeSearch(
          `${category.name} ${category.slug} ${category.parent?.name ?? ""}`,
        ).includes(normalizedQuery),
      )
      .sort((first, second) =>
        categoryLabel(first).localeCompare(categoryLabel(second), "fa"),
      )
      .slice(0, 8);
  }, [categories, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectCategory = (categoryId: string) => {
    updateField("category", categoryId);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor="product-category-search"
          className="text-sm font-semibold text-slate-200"
        >
          دسته‌بندی <span className="text-rose-400">*</span>
        </label>
        <span className="text-[11px] text-slate-500">
          {categories.length.toLocaleString("fa-IR")} دسته
        </span>
      </div>

      {selectedCategory ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="min-w-0">
            <span className="block text-[10px] text-emerald-300/70">
              دسته انتخاب‌شده
            </span>
            <span className="block truncate text-xs font-semibold text-emerald-200">
              {categoryLabel(selectedCategory)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateField("category", "")}
            className="shrink-0 rounded-md p-1 text-emerald-300 transition hover:bg-emerald-400/10 hover:text-white"
            aria-label="حذف دسته‌بندی انتخاب‌شده"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          id="product-category-search"
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="product-category-results"
          autoComplete="off"
          value={query}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder="نام دسته، دسته مادر یا اسلاگ را جستجو کنید..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 pr-10 pl-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {isOpen ? (
        <div
          id="product-category-results"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/30"
        >
          {!query.trim() ? (
            <p className="px-4 py-3 text-xs text-slate-400">
              برای نمایش دسته‌ها، بخشی از نام را وارد کنید.
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">
              دسته‌ای با این عبارت پیدا نشد.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto p-1.5">
              {searchResults.map((category) => {
                const isSelected = category._id === form.category;
                return (
                  <li key={category._id}>
                    <button
                      type="button"
                      onClick={() => selectCategory(category._id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right text-xs transition ${
                        isSelected
                          ? "bg-indigo-500/15 text-indigo-200"
                          : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {category.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                          {category.parent
                            ? `زیرمجموعه ${category.parent.name}`
                            : "دسته اصلی"}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {searchResults.length === 8 ? (
            <p className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-500">
              ۸ نتیجه اول نمایش داده شده؛ برای نتیجه دقیق‌تر عبارت بیشتری بنویسید.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CategorySelector;
