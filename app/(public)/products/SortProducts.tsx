"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const sortOptions = [
  { label: "پرفروش‌ترین", value: "bestSeller" },
  { label: "بیشترین قیمت", value: "highPrice" },
  { label: "کمترین قیمت", value: "lowPrice" },
  { label: "جدیدترین", value: "newest" },
  { label: "بیشترین تخفیف", value: "highestDiscount" },
];

export default function SortProducts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedSort = searchParams.get("sort");
  // !next16
  // const handleChange = (value: string | null) => {
  //   const params = new URLSearchParams(searchParams);
  //   params.set("sort", value || "");
  //   params.set("page", "1");
  //   router.push(`${pathname}?${params.toString()}`, { scroll: false });
  // };
  const handleChange = (value: string | null) => {
    // تبدیل ReadonlyURLSearchParams به آرایه
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("sort", value || "");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
  );
}
