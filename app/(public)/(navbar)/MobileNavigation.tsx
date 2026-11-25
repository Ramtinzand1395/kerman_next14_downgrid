"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEventHandler, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/app/components/navigation/NavigationFeedback";
import MobileMenu from "./MobileMenu";
import { navigationItems } from "./navigationItems";
import { categories } from "../constants/categories";

type MenuView = "menu" | "categories";
const historyKey = "kermanAtariMobileNavigation";
const OpenMenuContext = createContext<(() => void) | null>(null);
const quickLinks = categories.flatMap(category => category.subcategories).slice(0, 6);

function readView(state: unknown): MenuView | null {
  if (!state || typeof state !== "object" || !(historyKey in state)) return null;
  const view = state[historyKey];
  return view === "menu" || view === "categories" ? view : null;
}

type OpenMobileMenuProps = Pick<
  React.ComponentProps<typeof MobileMenu>,
  "view" | "onClose" | "onOpenCategories" | "onNavigate" | "onLinkClick" | "onLeave"
>;

function OpenMobileMenu(props: OpenMobileMenuProps) {
  const { data: session } = useSession();

  return (
    <MobileMenu
      {...props}
      menuItems={navigationItems}
      quickLinks={quickLinks}
      user={session?.user ? { name: session.user.username } : null}
    />
  );
}

export function MobileMenuTrigger() {
  const openMenu = useContext(OpenMenuContext);

  return (
    <button
      className="rounded-xl border border-slate-200 bg-white p-2 text-black shadow-sm xl:hidden"
      type="button"
      aria-label="باز کردن منو"
      onClick={openMenu ?? undefined}
      title="باز کردن منو"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

export default function MobileNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [view, setView] = useState<MenuView | null>(null);
  const pendingBack = useRef<{ action?: () => void } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = view !== null;

  useEffect(() => {
    function restore(event: PopStateEvent) {
      const nextView = readView(event.state);
      setView(nextView);
      const action = pendingBack.current?.action;
      pendingBack.current = null;

      if (action) {
        // Let the App Router restore the underlying entry before following the link.
        window.setTimeout(action, 0);
      } else if (!nextView && opener.current) {
        opener.current.focus({ preventScroll: true });
        opener.current = null;
      }
    }

    window.addEventListener("popstate", restore);
    const initialView = readView(window.history.state);
    if (initialView) setView(initialView);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const goBack = useCallback((all: boolean, action?: () => void) => {
    if (pendingBack.current) return;
    const current = readView(window.history.state);
    if (!current) {
      setView(null);
      action?.();
      return;
    }

    pendingBack.current = { action };
    window.history.go(all && current === "categories" ? -2 : -1);
  }, []);

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
      if (desktop.matches) goBack(true);
    }

    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      html.style.overflow = htmlOverflow;
      body.style.overflow = bodyOverflow;
    };
  }, [goBack, open]);

  const openMenu = useCallback(() => {
    if (readView(window.history.state)) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.history.pushState({ [historyKey]: "menu" }, "");
    setView("menu");
  }, []);

  function openCategories() {
    if (readView(window.history.state) !== "menu") return;
    window.history.pushState({ [historyKey]: "categories" }, "");
    setView("categories");
  }

  function navigate(href: string) {
    goBack(true, () => router.push(href));
  }

  const followLink: MouseEventHandler<HTMLAnchorElement> = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const { pathname, search, hash } = new URL(event.currentTarget.href);
    navigate(`${pathname}${search}${hash}`);
  };

  return (
    <OpenMenuContext.Provider value={openMenu}>
      {children}
      {view && (
        <OpenMobileMenu
          view={view}
          onClose={() => goBack(false)}
          onOpenCategories={openCategories}
          onNavigate={navigate}
          onLinkClick={followLink}
          onLeave={action => goBack(true, action)}
        />
      )}
    </OpenMenuContext.Provider>
  );
}
