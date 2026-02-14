"use client";

import { ArrowDownUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const sortOptions = [
  { label: "پیش‌فرض", value: "" },
  { label: "بیشترین قیمت", value: "highPrice" },
  { label: "کمترین قیمت", value: "lowPrice" },
  { label: "جدیدترین", value: "newest" },
];

interface SortProductsProps {
  totalProducts: number;
}

export default function SortProducts({ totalProducts }: SortProductsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedSort = searchParams.get("sort") || "";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <ArrowDownUp size={16} className="text-blue-600" />
        مرتب‌سازی محصولات
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="hidden items-center gap-2 md:flex">
          {sortOptions.map((option) => {
            const isActive = selectedSort === option.value;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => handleChange(option.value)}
                className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <select
          title="مرتب سازی"
          value={selectedSort}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 md:hidden"
        >
          {sortOptions.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 sm:text-sm">
          تعداد نتایج: {totalProducts.toLocaleString("fa-IR")}
        </span>
      </div>
    </div>
  );
}
