"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  createContext,
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";

export type ProductNavigationKind = "filter" | "search" | "sort" | "page";

type ProductNavigationContextValue = {
  isPending: boolean;
  pendingKind: ProductNavigationKind | null;
  navigate: (href: string, kind?: ProductNavigationKind) => void;
};

const ProductNavigationContext = createContext<ProductNavigationContextValue | null>(null);

export function ProductNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startNavigation] = useTransition();
  const [pendingKind, setPendingKind] =
    useState<ProductNavigationKind | null>(null);

  useEffect(() => {
    if (!isPending) setPendingKind(null);
  }, [isPending]);

  const navigate = useCallback(
    (href: string, kind: ProductNavigationKind = "filter") => {
      if (isPending) return;
      setPendingKind(kind);
      startNavigation(() => {
        router.push(href, { scroll: false });
      });
    },
    [isPending, router],
  );

  const pendingLabel =
    pendingKind === "search"
      ? "در حال جستجو…"
      : pendingKind === "page"
        ? "در حال نمایش صفحه…"
        : "در حال به‌روزرسانی نتایج…";

  return (
    <ProductNavigationContext.Provider
      value={{ isPending, pendingKind, navigate }}
    >
      <div className="relative" aria-busy={isPending}>
        {isPending && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-4 py-2 text-xs font-bold text-blue-800 shadow-lg backdrop-blur" role="status">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            {pendingLabel}
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

type ProductNavigationLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  navigationKind?: ProductNavigationKind;
};

export function ProductNavigationLink({
  href,
  navigationKind = "filter",
  onClick,
  target,
  ...props
}: ProductNavigationLinkProps) {
  const { isPending, navigate } = useProductNavigation();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank" ||
      props.download !== undefined
    ) {
      return;
    }

    event.preventDefault();
    if (!isPending) navigate(href, navigationKind);
  };

  return (
    <Link
      {...props}
      href={href}
      target={target}
      scroll={false}
      onClick={handleClick}
      aria-disabled={isPending || undefined}
    />
  );
}
