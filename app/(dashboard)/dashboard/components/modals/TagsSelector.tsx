"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

import type { ProductForm, Tag } from "@/types";

interface TagsSelectorProps {
  form: ProductForm;
  tagsList: Tag[];
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

const TagsSelector = ({ updateField, form, tagsList }: TagsSelectorProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = useMemo(
    () => tagsList.filter((tag) => form.tags.includes(tag._id)),
    [form.tags, tagsList],
  );

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return [];

    return tagsList
      .filter((tag) =>
        normalizeSearch(`${tag.name} ${tag.slug}`).includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [query, tagsList]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleTag = (tagId: string) => {
    const nextTags = form.tags.includes(tagId)
      ? form.tags.filter((id) => id !== tagId)
      : [...form.tags, tagId];
    updateField("tags", nextTags);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor="product-tags-search"
          className="text-sm font-semibold text-slate-200"
        >
          تگ‌ها
        </label>
        <span className="text-[11px] text-slate-500">
          {selectedTags.length.toLocaleString("fa-IR")} انتخاب‌شده از{" "}
          {tagsList.length.toLocaleString("fa-IR")}
        </span>
      </div>

      {selectedTags.length > 0 ? (
        <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/40 p-2">
          {selectedTags.map((tag) => (
            <span
              key={tag._id}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/15 py-1 pr-2.5 pl-1.5 text-[11px] font-medium text-indigo-200"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag._id)}
                className="rounded-full p-0.5 text-indigo-300 transition hover:bg-indigo-400/20 hover:text-white"
                aria-label={`حذف تگ ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-[11px] text-slate-500">
          هنوز تگی انتخاب نشده است.
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          id="product-tags-search"
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="product-tags-results"
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
          placeholder="نام یا اسلاگ تگ را جستجو کنید..."
          className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 pr-10 pl-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {isOpen ? (
        <div
          id="product-tags-results"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/30"
        >
          {!query.trim() ? (
            <p className="px-4 py-3 text-xs text-slate-400">
              برای نمایش تگ‌ها، بخشی از نام را وارد کنید.
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">
              تگی با این عبارت پیدا نشد.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto p-1.5">
              {searchResults.map((tag) => {
                const isSelected = form.tags.includes(tag._id);
                return (
                  <li key={tag._id}>
                    <button
                      type="button"
                      onClick={() => toggleTag(tag._id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right text-xs transition ${
                        isSelected
                          ? "bg-indigo-500/15 text-indigo-200"
                          : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {tag.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                          /{tag.slug}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-500 text-white"
                            : "border-slate-600"
                        }`}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
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

export default TagsSelector;
