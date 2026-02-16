"use client";

import { useMemo, useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { categories } from "../../constants/categories";

export default function FilterProducts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openedGroup, setOpenedGroup] = useState<string | null>(
    categories[0]?.slug ?? null,
  );
  const selectedCategory = searchParams.get("category") || "";

  const flatCategories = useMemo(
    () =>
      categories.flatMap((item) => [
        { name: item.name, slug: item.slug },
        ...item.subcategories.map((sub) => ({
          name: sub.name,
          slug: sub.slug,
        })),
      ]),
    [],
  );

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (!value) {
      params.delete("category");
    } else {
      params.set("category", value);
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setMobileOpen(false);
  };

  const selectedLabel =
    flatCategories.find((item) => item.slug === selectedCategory)?.name ||
    "همه محصولات";

  const FilterBody = () => (
    <>
      <button
        type="button"
        onClick={() => handleFilter("")}
        className={`mb-3 w-full rounded-xl px-3 py-2 text-right text-sm font-medium transition-colors ${
          !selectedCategory
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        همه محصولات
      </button>

      <nav className="flex flex-col gap-2" aria-label="فیلتر دسته‌بندی محصولات">
        {categories.map((cat) => {
          const isActiveParent = selectedCategory === cat.slug;
          const isExpanded = openedGroup === cat.slug || isActiveParent;

          return (
            <section
              key={cat.slug}
              className="rounded-xl border border-gray-100 p-2"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFilter(cat.slug)}
                  className={`flex-1 rounded-lg px-3 py-2 text-right text-sm font-semibold transition-colors ${
                    isActiveParent
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenedGroup(isExpanded ? null : cat.slug)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500"
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
                    const isActive = selectedCategory === sub.slug;
                    return (
                      <li key={sub.slug}>
                        <button
                          type="button"
                          onClick={() => handleFilter(sub.slug)}
                          className={`w-full rounded-lg px-3 py-2 text-right text-sm transition-colors ${
                            isActive
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {sub.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:hidden">
        <div className="min-w-0 flex-1 text-xs text-gray-500">
          فیلتر فعال:{" "}
          <span className="font-semibold text-gray-700 truncate inline-block max-w-full align-bottom">
            {selectedLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          <Filter size={16} /> فیلتر
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-gray-800">
                <Filter size={17} /> دسته‌بندی محصولات
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
            <FilterBody />
          </div>
          <button
            type="button"
            className="h-full w-full"
            title="بستن"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <aside className="hidden h-fit w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:sticky md:top-24 md:block">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-gray-800">
          <Filter size={17} /> دسته‌بندی محصولات
        </h2>
        <FilterBody />
      </aside>
    </>
  );
}
