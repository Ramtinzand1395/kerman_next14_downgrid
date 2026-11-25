"use client";

import { type FormEvent } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/app/components/navigation/NavigationFeedback";
import { headerControlFocus } from "./navigationItems";

export default function DesktopSearch() {
  const router = useRouter();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const searchParams = new URLSearchParams({ q: query, page: "1", sort: "newest" });
    router.push(query ? `/products?${searchParams}` : "/products");
  }

  return (
    <form
      role="search"
      aria-label="جستجو در محصولات"
      onSubmit={search}
      className="hidden min-h-11 min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 pe-1 ps-4 focus-within:border-blue-600 xl:flex"
    >
      <input
        type="search"
        name="q"
        autoComplete="off"
        aria-label="جستجو در محصولات"
        placeholder="جستجو در محصولات..."
        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500"
      />
      <button
        type="submit"
        aria-label="اجرای جستجو"
        className={`grid h-9 w-10 shrink-0 place-items-center rounded-lg bg-blue-900 text-white transition-colors hover:bg-blue-700 ${headerControlFocus}`}
      >
        <Search aria-hidden="true" className="h-4 w-4" />
      </button>
    </form>
  );
}
