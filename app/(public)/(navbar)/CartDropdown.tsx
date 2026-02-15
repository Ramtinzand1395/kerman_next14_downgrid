"use client";

import useCartStore from "@/stores/cartStore";
import { CartItem } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type DropdownType = "user" | "cart" | null;
interface CartDropdownProps {
  setActiveDropdown: React.Dispatch<React.SetStateAction<DropdownType>>;
  activeDropdown: DropdownType;
}

export default function CartDropdown({
  setActiveDropdown,
  activeDropdown,
}: CartDropdownProps) {
  const { cart } = useCartStore();

  return (
    <div
      className="relative"
      onMouseEnter={() => setActiveDropdown("cart")}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <Link
        aria-label="سبد خرید"
        href="/cart"
        className="relative flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 md:border-0 md:bg-transparent md:p-0"
      >
        <ShoppingBag className="h-4 w-4 text-black" />
        {cart.length > 0 && (
          <span
            className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white"
            aria-live="polite"
          >
            {cart.length}
          </span>
        )}
        {cart.length > 0 && (
          <ChevronDown className="ml-1 hidden h-3 w-3 md:block" />
        )}
      </Link>

      <AnimatePresence>
        {activeDropdown === "cart" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 top-10 z-50 hidden w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl md:block"
          >
            {cart.length > 0 ? (
              <>
                <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-72 overflow-y-auto">
                  {cart.map((item: CartItem) => (
                    <div
                      key={item.sku}
                      className="mb-3 flex items-center gap-3 border-b border-gray-200 pb-2 last:border-b-0"
                    >
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={60}
                        height={60}
                        className="rounded-md object-cover"
                        loading="lazy"
                      />
                      <div className="flex flex-1 flex-col">
                        <h3 className="truncate text-sm font-semibold text-gray-800">
                          {item.title}
                        </h3>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                          <span>{item.quantity} عدد</span>
                          <span>{item.price.toLocaleString()} تومان</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <Link
                    href="/cart"
                    className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm text-white transition-all hover:bg-blue-700"
                  >
                    مشاهده سبد خرید
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-gray-600">
                سبد خرید خالی است
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
