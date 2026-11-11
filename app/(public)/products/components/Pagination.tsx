"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { ProductNavigationLink } from "./ProductNavigation";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

const directionClass =
  "inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition";

export default function Pagination({ totalPages, currentPage }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const pageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) params.delete("page");
    else params.set("page", page.toString());

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );
  const previousLabel = <><ChevronRight size={16} aria-hidden="true" /> قبلی</>;
  const nextLabel = <>بعدی <ChevronLeft size={16} aria-hidden="true" /></>;

  return (
    <nav aria-label="صفحه‌بندی محصولات" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {currentPage > 1 ? (
        <ProductNavigationLink href={pageHref(currentPage - 1)} navigationKind="page" className={directionClass}>
          {previousLabel}
        </ProductNavigationLink>
      ) : (
        <span aria-disabled="true" className={`${directionClass} opacity-40`}>{previousLabel}</span>
      )}

      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        const showDots = prevPage && page - prevPage > 1;

        return (
          <div key={page} className="flex items-center gap-2">
            {showDots && <span aria-hidden="true" className="text-sm text-gray-400">...</span>}
            {page === currentPage ? (
              <span aria-current="page" className="min-w-10 rounded-xl border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white">
                {page.toLocaleString("fa-IR")}
              </span>
            ) : (
              <ProductNavigationLink
                href={pageHref(page)}
                navigationKind="page"
                className="min-w-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                {page.toLocaleString("fa-IR")}
              </ProductNavigationLink>
            )}
          </div>
        );
      })}

      {currentPage < totalPages ? (
        <ProductNavigationLink href={pageHref(currentPage + 1)} navigationKind="page" className={directionClass}>
          {nextLabel}
        </ProductNavigationLink>
      ) : (
        <span aria-disabled="true" className={`${directionClass} opacity-40`}>{nextLabel}</span>
      )}
    </nav>
  );
}
