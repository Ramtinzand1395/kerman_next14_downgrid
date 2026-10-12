"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type ProductNavigationContextValue = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const ProductNavigationContext = createContext<ProductNavigationContextValue | null>(null);

export function ProductNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startNavigation] = useTransition();

  const navigate = (href: string) => {
    startNavigation(() => {
      router.push(href, { scroll: false });
    });
  };

  return (
    <ProductNavigationContext.Provider value={{ isPending, navigate }}>
      <div className="relative" aria-busy={isPending}>
        {isPending && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-4 py-2 text-xs font-bold text-blue-800 shadow-lg backdrop-blur" role="status">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            در حال به‌روزرسانی نتایج…
          </div>
        )}
        {children}
      </div>
    </ProductNavigationContext.Provider>
  );
}

export function useProductNavigation() {
  const context = useContext(ProductNavigationContext);
  if (!context) throw new Error("useProductNavigation must be used inside ProductNavigationProvider");
  return context;
}
