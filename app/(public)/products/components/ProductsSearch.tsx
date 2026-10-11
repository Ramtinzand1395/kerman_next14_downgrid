"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type ProductsSearchProps = {
  initialQuery?: string;
};

export default function ProductsSearch({
  initialQuery = "",
}: ProductsSearchProps) {
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
      className="mt-5 flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 p-2.5 shadow-lg shadow-blue-950/20 backdrop-blur"
      role="search"
      aria-label="جستجو در نتایج محصولات"
    >
      <Search className="h-4 w-4 text-white" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="نام محصول، بازی یا کنسول را جستجو کنید"
        className="min-h-8 w-full bg-transparent text-sm text-white placeholder:text-blue-100 outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            updateRoute("");
          }}
          className="rounded-full bg-white/30 p-1 text-white transition hover:bg-white/40"
          aria-label="حذف عبارت جستجو"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        className="min-h-9 shrink-0 rounded-xl bg-white px-4 py-1 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
      >
        جستجو
      </button>
    </form>
  );
}
