"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const categories = [
  {
    name: "کنسول‌ها",
    slug: "consoles",
    subcategories: [
      { name: "پلی‌استیشن 5", slug: "playstation-5" },
      { name: "پلی‌استیشن 4", slug: "playstation-4" },
      { name: "پلی‌استیشن 3", slug: "playstation-3" },
    ],
  },
  {
    name: "بازی‌ها",
    slug: "games",
    subcategories: [
      { name: "بازی اکانتی", slug: "account-games" },
      { name: "بازی دیسکی", slug: "disc-games" },
      { name: "گیفت کارت", slug: "gift-cards" },
    ],
  },
  {
    name: "لوازم جانبی",
    slug: "accessories",
    subcategories: [
      { name: "دسته بازی", slug: "controllers" },
      { name: "هدست و هدفون", slug: "headsets" },
      { name: "پایه و خنک‌کننده", slug: "stands-coolers" },
    ],
  },
  {
    name: "لوازم گیمینگ",
    slug: "gaming-accessories",
    subcategories: [
      { name: "موس", slug: "mouse" },
      { name: "کیبورد", slug: "keyboard" },
      { name: "پاوربانک", slug: "powerbank" },
    ],
  },
];

export default function FilterProducts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedCategory = searchParams.get("category") || "";

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
    categories
      .flatMap((item) => [
        { name: item.name, slug: item.slug },
        ...item.subcategories.map((sub) => ({ name: sub.name, slug: sub.slug })),
      ])
      .find((item) => item.slug === selectedCategory)?.name || "همه محصولات";

  const FilterBody = () => (
    <>
      <button
        type="button"
        onClick={() => handleFilter("")}
        className={`mb-2 w-full rounded-xl px-3 py-2 text-right text-sm font-medium transition-colors ${
          !selectedCategory
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        همه محصولات
      </button>

      <nav className="flex flex-col gap-3">
        {categories.map((cat) => (
          <div key={cat.slug}>
            <button
              type="button"
              onClick={() => handleFilter(cat.slug)}
              className={`mb-1 w-full rounded-xl px-3 py-2 text-right text-sm font-semibold transition-colors ${
                selectedCategory === cat.slug
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {cat.name}
            </button>

            <ul className="space-y-1 pr-2">
              {cat.subcategories.map((sub) => {
                const isActive = selectedCategory === sub.slug;
                return (
                  <li key={sub.slug}>
                    <button
                      type="button"
                      onClick={() => handleFilter(sub.slug)}
                      className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition-colors ${
                        isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {sub.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:hidden">
        <div className="text-xs text-gray-500">
          فیلتر فعال: <span className="font-semibold text-gray-700">{selectedLabel}</span>
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

      <aside className="hidden h-fit w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:block md:sticky md:top-24">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-gray-800">
          <Filter size={17} /> دسته‌بندی محصولات
        </h2>
        <FilterBody />

        <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-500">
          با انتخاب دسته‌بندی، سریع‌تر به محصولات مرتبط برسید.
        </p>
      </aside>
    </>
  );
}
