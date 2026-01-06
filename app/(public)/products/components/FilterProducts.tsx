"use client";
import { useState } from "react";
import { FilterIcon, XIcon } from "lucide-react";
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
    name: "خدمات",
    slug: "services",
    subcategories: [
      { name: "نصب بازی", slug: "game-installation" },
      { name: "اکانت قانونی", slug: "legal-accounts" },
      { name: "تعمیرات کنسول", slug: "console-repair" },
    ],
  },
  {
    name: "لوازم گیمینگ",
    slug: "gaming",
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
  const selectedCategory = searchParams.get("category");

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("category", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setMobileOpen(false); // بستن منو بعد از انتخاب
  };

  return (
    <>
      {/* دکمه موبایل */}
      <div className="md:hidden fixed top-14 right-4 z-50">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg"
          onClick={() => setMobileOpen(true)}
        >
          <FilterIcon size={18} /> دسته‌بندی‌ها
        </button>
      </div>

      {/* Overlay منوی موبایل */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="fixed top-0 left-0 w-3/4 max-w-xs h-full bg-white p-4 shadow-xl overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FilterIcon size={18} /> دسته‌بندی‌ها
              </h2>
              <button
                title="بستن"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-gray-200"
              >
                <XIcon size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              {categories.map((cat) => (
                <div key={cat.slug}>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {cat.name}
                  </p>
                  <ul className="ml-2 flex flex-col gap-1">
                    {cat.subcategories.map((sub) => {
                      const isActive = selectedCategory === sub.slug;
                      return (
                        <li
                          key={sub.slug}
                          className={`block px-2 py-1.5 rounded-md text-sm cursor-pointer transition-all ${
                            isActive
                              ? "bg-blue-500 text-white"
                              : "text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                          }`}
                          onClick={() => handleFilter(sub.slug)}
                        >
                          {sub.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* کلیک روی overlay برای بستن */}
          <div
            className="w-full h-full"
            onClick={() => setMobileOpen(false)}
          ></div>
        </div>
      )}

      {/* منوی دسکتاپ */}
      <aside className="hidden md:block w-64 bg-gray-50 rounded-2xl shadow-sm p-4 md:sticky md:top-24">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <FilterIcon size={18} /> دسته‌بندی‌ها
        </h2>
        <nav className="flex flex-col gap-2">
          {categories.map((cat) => (
            <div key={cat.slug}>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {cat.name}
              </p>
              <ul className="ml-2 flex flex-col gap-1">
                {cat.subcategories.map((sub) => {
                  const isActive = selectedCategory === sub.slug;
                  return (
                    <li
                      key={sub.slug}
                      className={`block px-2 py-1.5 rounded-md text-sm cursor-pointer transition-all ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : "text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                      }`}
                      onClick={() => handleFilter(sub.slug)}
                    >
                      {sub.name}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
