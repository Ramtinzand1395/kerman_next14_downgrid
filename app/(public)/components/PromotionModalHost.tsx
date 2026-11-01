"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PromotionOffer } from "@/lib/promotions/policy";

const PromotionDialog = dynamic(() => import("./PromotionDialog"), { ssr: false });

export default function PromotionModalHost() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const blocked = /^\/(auth|checkout|payment)(\/|$)/.test(pathname);
  const identity = status === "authenticated" ? session?.user?.id : "guest";
  const shown = useRef(new Set<string>());
  const [offer, setOffer] = useState<PromotionOffer | null>(null);
  const close = useCallback(() => setOffer(null), []);

  useEffect(() => {
    setOffer(null);
    if (status === "loading" || blocked) return;
    const controller = new AbortController();
    let disposed = false;
    let requestNumber = 0;
    async function refresh() {
      const request = ++requestNumber;
      try {
        const response = await fetch("/api/promotions", { cache: "no-store", signal: controller.signal });
        const data = response.ok ? await response.json() : { promotion: null };
        const promotion: PromotionOffer | null = data.promotion ?? null;
        if (disposed || request !== requestNumber) return;
        if (!promotion || (promotion.expiresAt && Date.parse(promotion.expiresAt) <= Date.now())) {
          setOffer(null); return;
        }
        const key = `${identity}:${promotion.id}`;
        if (shown.current.has(key)) {
          setOffer((current) => current?.id === promotion.id ? promotion : null); return;
        }
        shown.current.add(key);
        setOffer(promotion);
      } catch { if (!disposed && request === requestNumber) setOffer(null); }
    }
    const delay = window.setTimeout(() => { void refresh(); }, 800);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) void refresh(); };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      disposed = true; controller.abort(); window.clearTimeout(delay);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [status, identity, blocked]);

  useEffect(() => {
    if (!offer?.expiresAt) return;
    const remaining = Date.parse(offer.expiresAt) - Date.now();
    if (remaining <= 0) { close(); return; }
    const timeout = window.setTimeout(close, Math.min(remaining, 2147483647));
    return () => window.clearTimeout(timeout);
  }, [offer, close]);

  return offer && !blocked ? <PromotionDialog offer={offer} onClose={close} /> : null;
}
