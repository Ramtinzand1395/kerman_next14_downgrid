"use client";

import { useEffect, useId, useRef, useState, type MouseEventHandler } from "react";
import { Grid2x2, Home, ShoppingBag, UserRound, Wrench, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link, { useRouter } from "@/app/components/navigation/NavigationFeedback";
import useCartStore from "@/stores/cartStore";
import Sidebar from "../my-profile/Sidebar";
import MobileCategoryDialog from "./MobileCategoryDialog";

const historyKey = "kermanAtariMobileNavigation";
const catalogSections = ["/category", "/categories", "/product", "/products", "/used-consoles"];
const loginHref = "/auth/login?callbackUrl=%2Fmy-profile";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountButton = useRef<HTMLButtonElement>(null);
  const accountClose = useRef<HTMLButtonElement>(null);
  const accountId = useId();
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

  const overlayOpen = open || accountOpen;
  useEffect(() => {
    if (!overlayOpen) return;
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
  }, [overlayOpen]);

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

  function closeAccount(restoreFocus = true) {
    setAccountOpen(false);
    if (restoreFocus) accountButton.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!accountOpen) return;
    accountClose.current?.focus({ preventScroll: true });
    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAccountOpen(false);
      accountButton.current?.focus({ preventScroll: true });
    }
    const desktop = window.matchMedia("(min-width: 1280px)");
    const resize = () => { if (desktop.matches) setAccountOpen(false); };
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", dismiss);
    return () => {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", dismiss);
    };
  }, [accountOpen]);

  const dismissViaBottomLink: MouseEventHandler<HTMLAnchorElement> = event => {
    if (!accountOpen) return;
    event.preventDefault();
    closeAccount();
  };

  const dashboardHref = session?.user?.role === "admin"
    ? "/dashboard/store-order"
    : session?.user?.role === "superadmin" ? "/dashboard" : null;

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
        className={`fixed inset-x-0 bottom-0 ${accountOpen ? "z-[60]" : "z-30"} grid h-[var(--mobile-nav-offset)] grid-cols-5 gap-0.5 border-t border-slate-200 bg-white p-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] pb-[max(0.25rem,env(safe-area-inset-bottom))] pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] xl:hidden`}
      >
        <Link href="/" onClick={dismissViaBottomLink} aria-current={homeActive ? "page" : undefined} className={itemClass(homeActive)}>
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
          onClick={() => accountOpen ? closeAccount() : openCategories()}
          className={itemClass(categoryActive)}
        >
          <Grid2x2 aria-hidden="true" className="h-5 w-5" />
          دسته‌بندی‌ها
        </button>
        <Link href="/services" onClick={dismissViaBottomLink} aria-current={servicesActive ? "page" : undefined} className={itemClass(servicesActive)}>
          <Wrench aria-hidden="true" className="h-5 w-5" />
          خدمات
        </Link>
        <Link href={cartHref} onClick={dismissViaBottomLink} aria-label={count ? `سبد خرید، ${countLabel} کالا` : "سبد خرید"} aria-current={cartActive ? "page" : undefined} className={itemClass(cartActive)}>
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
        ) : session?.user ? (
          <button
            type="button"
            ref={accountButton}
            aria-expanded={accountOpen}
            aria-controls={accountOpen ? accountId : undefined}
            onClick={() => accountOpen ? closeAccount() : setAccountOpen(true)}
            className={itemClass(accountOpen || accountActive)}
          >
            <UserRound aria-hidden="true" className="h-5 w-5" />
            حساب من
          </button>
        ) : (
          <Link href={loginHref} aria-current={accountActive ? "location" : undefined} className={itemClass(accountActive)}>
            <UserRound aria-hidden="true" className="h-5 w-5" />
            حساب من
          </Link>
        )}
      </nav>
      {accountOpen && (
        <div className="fixed inset-0 bottom-[var(--mobile-nav-offset)] z-[55] flex items-end xl:hidden">
          <button type="button" tabIndex={-1} aria-label="بستن منو با کلیک بیرون" className="absolute inset-0 bg-black/50" onClick={() => closeAccount()} />
          <section id={accountId} role="dialog" aria-label="بخش‌های حساب من" className="relative max-h-full w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">بخش‌های حساب من</h2>
              <button ref={accountClose} type="button" aria-label="بستن منوی حساب" onClick={() => closeAccount()} className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-50">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {dashboardHref && <Link href={dashboardHref} onClick={() => closeAccount(false)} className="mb-2 block rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">داشبورد</Link>}
            <Sidebar onSelect={() => closeAccount(false)} />
          </section>
        </div>
      )}
      {open && <MobileCategoryDialog id={categoryId} onBack={() => closeCategories()} onLinkClick={followCategory} />}
    </>
  );
}
