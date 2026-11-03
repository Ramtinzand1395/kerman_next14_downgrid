"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { createContext, forwardRef, useCallback, useContext, useMemo, useTransition, type ComponentProps, type ReactNode } from "react";
import { PageLoading } from "@/app/components/loading/LoadingSystem";

type Router = ReturnType<typeof useNextRouter>;
type Navigate = (href: string, method: "push" | "replace", options?: Parameters<Router["push"]>[1]) => void;
const NavigationContext = createContext<Navigate | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useNextRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback<Navigate>((href, method, options) => {
    startTransition(() => router[method](href, options));
  }, [router]);
  return (
    <NavigationContext.Provider value={navigate}>
      {children}
      {pending && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-white/95" aria-live="polite"><PageLoading /></div>}
    </NavigationContext.Provider>
  );
}

/** Same router API, with the shared page transition indicator. */
export function useRouter(): Router {
  const router = useNextRouter();
  const navigate = useContext(NavigationContext);
  return useMemo(() => navigate ? {
    ...router,
    push: (href, options) => navigate(href, "push", options),
    replace: (href, options) => navigate(href, "replace", options),
  } : router, [router, navigate]);
}

/** Keep Next prefetching, modifier clicks, hashes and caller onClick behavior. */
const NavigationLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function NavigationLink({ onClick, href, replace, scroll, target, download, ...props }, ref) {
    const navigate = useContext(NavigationContext);
    return <NextLink {...props} ref={ref} href={href} replace={replace} scroll={scroll} target={target} download={download} onClick={(event) => {
      onClick?.(event);
      if (!navigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (target && target !== "_self") || download !== undefined) return;
      const url = new URL(event.currentTarget.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/") || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`, replace ? "replace" : "push", { scroll });
    }} />;
  },
);
export default NavigationLink;
