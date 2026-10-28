"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useProductNavigation } from "./ProductNavigation";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export default function Pagination({ totalPages, currentPage }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isPending, navigate } = useProductNavigation();

  if (totalPages <= 1) {
    return null;
  }

  const handlePage = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    navigate(`${pathname}?${params.toString()}`, "page");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => handlePage(currentPage - 1)}
        disabled={currentPage === 1 || isPending}
        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} /> قبلی
      </button>

      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        const showDots = prevPage && page - prevPage > 1;

        return (
          <div key={page} className="flex items-center gap-2">
            {showDots && <span className="text-sm text-gray-400">...</span>}
            <button
              type="button"
              onClick={() => handlePage(page)}
              disabled={isPending}
              className={`min-w-10 rounded-xl border px-3 py-2 text-sm transition ${
                page === currentPage
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-700"
              }`}
            >
              {page.toLocaleString("fa-IR")}
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => handlePage(currentPage + 1)}
        disabled={currentPage === totalPages || isPending}
        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        بعدی <ChevronLeft size={16} />
      </button>
    </div>
  );
}
