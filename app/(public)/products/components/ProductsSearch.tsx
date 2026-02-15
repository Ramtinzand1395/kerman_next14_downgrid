"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

interface ProductsSearchProps {
  initialQuery?: string;
}

export default function ProductsSearch({ initialQuery = "" }: ProductsSearchProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);

  const updateRoute = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateRoute(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex items-center gap-2 rounded-2xl border border-white/25 bg-white/15 p-2 backdrop-blur"
      role="search"
      aria-label="جستجو در نتایج محصولات"
    >
      <Search className="h-4 w-4 text-blue-100" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="نام محصول، بازی یا کنسول را جستجو کنید"
        className="w-full bg-transparent text-sm text-white placeholder:text-blue-100/80 outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            updateRoute("");
          }}
          className="rounded-full bg-white/20 p-1 text-white"
          aria-label="حذف عبارت جستجو"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button type="submit" className="rounded-xl bg-white px-3 py-1 text-xs font-bold text-blue-700">
        جستجو
      </button>
    </form>
  );
}
