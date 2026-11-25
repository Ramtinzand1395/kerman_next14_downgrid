"use client";

import { useEffect, useId, useRef, useState, type MouseEventHandler } from "react";
import { Grid2x2, Home, ShoppingBag, UserRound, Wrench } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link, { useRouter } from "@/app/components/navigation/NavigationFeedback";
import useCartStore from "@/stores/cartStore";
import { MOBILE_PROFILE_NAVIGATION_EVENT, profileRoute } from "@/lib/profileRoutes";
import MobileCategoryDialog from "./MobileCategoryDialog";

const historyKey = "kermanAtariMobileNavigation";
const catalogSections = ["/category", "/categories", "/product", "/products", "/used-consoles"];
const profileHref = profileRoute("profile");
const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(profileHref)}`;
const cartHref = "/cart?step=1";

function isCategoryOpen(state: unknown) {
  return !!state && typeof state === "object" && historyKey in state && state[historyKey] === "categories";
}

function inSection(pathname: string, section: string) {
  return pathname === section || pathname.startsWith(`${section}/`);
}

function itemClass(active: boolean) {
  return `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[11px] font-semibold leading-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 motion-reduce:transition-none ${
    active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
  }`;
}

export default function MobileNavigation() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { data: session, status } = useSession();
  const count = useCartStore(state => state.cart.reduce((total, item) => total + item.quantity, 0));
  const countLabel = count.toLocaleString("fa-IR");
  const categoryId = useId();
  const categoryTrigger = useRef<HTMLButtonElement>(null);
  const pendingBack = useRef<{ href?: string } | null>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function restore(event: PopStateEvent) {
      const nextOpen = isCategoryOpen(event.state);
      const closing = wasOpen.current && !nextOpen;
      wasOpen.current = nextOpen;
      setOpen(nextOpen);
      const href = pendingBack.current?.href;
      pendingBack.current = null;

      if (href) {
        // Let the App Router restore the page entry before following the link.
        window.setTimeout(() => router.push(href), 0);
      } else if (closing) {
        window.requestAnimationFrame(() => categoryTrigger.current?.focus({ preventScroll: true }));
      }
    }

    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [router]);

  useEffect(() => {
    wasOpen.current = isCategoryOpen(window.history.state);
    setOpen(wasOpen.current);
  }, []);

  function openCategories() {
    if (isCategoryOpen(window.history.state)) return;
    window.history.pushState({ [historyKey]: "categories" }, "");
    wasOpen.current = true;
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const htmlOverflow = html.style.overflow;
    const bodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const desktop = window.matchMedia("(min-width: 1280px)");
    function closeOnDesktop() {
      if (desktop.matches && isCategoryOpen(window.history.state) && !pendingBack.current) {
        pendingBack.current = {};
        window.history.back();
      }
    }
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      html.style.overflow = htmlOverflow;
      body.style.overflow = bodyOverflow;
    };
  }, [open]);

  function closeCategories(href?: string) {
    if (pendingBack.current) return;
    if (!isCategoryOpen(window.history.state)) {
      wasOpen.current = false;
      setOpen(false);
      if (href) router.push(href);
      return;
    }

    pendingBack.current = { href };
    window.history.back();
  }

  const followCategory: MouseEventHandler<HTMLAnchorElement> = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const { pathname, search, hash } = new URL(event.currentTarget.href);
    closeCategories(`${pathname}${search}${hash}`);
  };

  const showProfileMenu: MouseEventHandler<HTMLAnchorElement> = event => {
    if (pathname !== "/my-profile" || window.matchMedia("(min-width: 1024px)").matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.dispatchEvent(new Event(MOBILE_PROFILE_NAVIGATION_EVENT));
  };

  const accountHref = !session?.user
    ? loginHref
    : session.user.role === "admin"
      ? "/dashboard/store-order"
      : session.user.role === "superadmin"
        ? "/dashboard"
        : profileHref;

  const homeActive = pathname === "/";
  const categoryActive = open || catalogSections.some(section => inSection(pathname, section));
  const servicesActive = inSection(pathname, "/services");
  const cartActive = inSection(pathname, "/cart");
  const accountActive = inSection(pathname, "/my-profile") || inSection(pathname, "/auth") || inSection(pathname, "/notifications");

  return (
    <>
      <nav
        dir="rtl"
        aria-label="ناوبری اصلی موبایل"
        className="fixed inset-x-0 bottom-0 z-30 grid h-[var(--mobile-nav-offset)] grid-cols-5 gap-0.5 border-t border-slate-200 bg-white p-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] pb-[max(0.25rem,env(safe-area-inset-bottom))] pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] xl:hidden"
      >
        <Link href="/" aria-current={homeActive ? "page" : undefined} className={itemClass(homeActive)}>
          <Home aria-hidden="true" className="h-5 w-5" />
          خانه
        </Link>
        <button
          ref={categoryTrigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? categoryId : undefined}
          aria-current={categoryActive && !open ? "location" : undefined}
          onClick={openCategories}
          className={itemClass(categoryActive)}
        >
          <Grid2x2 aria-hidden="true" className="h-5 w-5" />
          دسته‌بندی‌ها
        </button>
        <Link href="/services" aria-current={servicesActive ? "page" : undefined} className={itemClass(servicesActive)}>
          <Wrench aria-hidden="true" className="h-5 w-5" />
          خدمات
        </Link>
        <Link href={cartHref} aria-label={count ? `سبد خرید، ${countLabel} کالا` : "سبد خرید"} aria-current={cartActive ? "page" : undefined} className={itemClass(cartActive)}>
          <span className="relative">
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            {count > 0 && <span aria-hidden="true" className="absolute -end-2.5 -top-1 rounded-full bg-rose-500 px-1 text-[10px] leading-4 text-white">{countLabel}</span>}
          </span>
          سبد خرید
        </Link>
        {status === "loading" ? (
          <button type="button" disabled aria-busy="true" className={itemClass(accountActive)}>
            <UserRound aria-hidden="true" className="h-5 w-5" />
            حساب من
          </button>
        ) : (
          <Link href={accountHref} onClick={showProfileMenu} aria-current={accountActive ? "location" : undefined} className={itemClass(accountActive)}>
            <UserRound aria-hidden="true" className="h-5 w-5" />
            حساب من
          </Link>
        )}
      </nav>
      {open && <MobileCategoryDialog id={categoryId} onBack={() => closeCategories()} onLinkClick={followCategory} />}
    </>
  );
}
