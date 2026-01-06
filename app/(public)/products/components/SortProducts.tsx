"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const sortOptions = [
  { label: "پرفروش‌ترین", value: "bestSeller" },
  { label: "بیشترین قیمت", value: "highPrice" },
  { label: "کمترین قیمت", value: "lowPrice" },
  { label: "جدیدترین", value: "newest" },
  { label: "بیشترین تخفیف", value: "highestDiscount" },
];
interface SortProductsProps {
  length: number;
}

export default function SortProducts({ length }: SortProductsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedSort = searchParams.get("sort") || "";;

  const handleChange = (value: string | null) => {
    // تبدیل ReadonlyURLSearchParams به آرایه
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("sort", value || "");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="hidden md:flex  flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">ترتیب نمایش:</span>
        {sortOptions.map((option) => {
          const isActive = selectedSort === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleChange(option.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {/* MOBILE DROPDOWN */}
      <select
        title="مرتب سازی"
        value={selectedSort}
        onChange={(e) => handleChange(e.target.value)}
        className="md:hidden w-3/4 text-black border border-blue-500 p-2 rounded-xl mt-10 md:mt-0"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500  mt-10 md:mt-0">
        تعداد کالاها: {length || 0}
      </span>
    </div>
  );
}
