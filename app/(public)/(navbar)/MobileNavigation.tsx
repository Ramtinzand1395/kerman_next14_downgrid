"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import MobileMenu from "./MobileMenu";
import { navigationItems } from "./navigationItems";
import { categories } from "../constants/categories";

const OpenMenuContext = createContext<(() => void) | null>(null);

// The mobile menu uses the same quick links in their current catalog order.
const quickLinks = categories.flatMap(category =>
  category.subcategories.map(subcategory => ({ ...subcategory, parentName: category.name })),
);

function OpenMobileMenu({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  return (
    <MobileMenu
      isOpen
      onClose={onClose}
      menuItems={navigationItems}
      categories={categories}
      quickLinks={quickLinks}
      user={session?.user ? { name: session.user.username, role: session.user.role } : null}
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
  const [open, setOpen] = useState(false);
  const openMenu = useCallback(() => setOpen(true), []);

  return (
    <OpenMenuContext.Provider value={openMenu}>
      {children}
      {open && <OpenMobileMenu onClose={() => setOpen(false)} />}
    </OpenMenuContext.Provider>
  );
}
