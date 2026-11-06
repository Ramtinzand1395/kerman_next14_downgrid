"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Profile and checkout steps are pages; filters and tabs keep their position. */
export default function NavigationScroll() {
  const pathname = usePathname();
  const search = useSearchParams();
  const step = pathname === "/my-profile" || pathname === "/cart" ? search.get("step") || "1" : "";
  const key = `${pathname}:${step}`;
  const previous = useRef<string | undefined>(undefined);
  const restoring = useRef(false);

  useLayoutEffect(() => {
    const onPopState = () => { restoring.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    const changed = previous.current !== key;
    previous.current = key;
    const restore = restoring.current;
    restoring.current = false;
    // Checkout history also opens the destination step at its start rather
    // than restoring a position from a different-sized checkout panel.
    if (!changed || (restore && pathname !== "/cart") || window.location.hash) return;
    // Dashboard pages scroll inside main rather than the window.
    const container = document.querySelector<HTMLElement>(".dashboard-main") || document.documentElement;
    const scroll = () => {
      container.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      if (container === document.documentElement) window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    };
    scroll();
    const frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [key, pathname]);

  return null;
}
