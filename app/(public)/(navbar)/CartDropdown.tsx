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
    <>
      <Link aria-label={"سبد خرید"} href="/cart">
        <div
          className="flex items-center gap-1 relative cursor-pointer"
          onMouseEnter={() => setActiveDropdown("cart")}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <ShoppingBag className="text-black w-5 h-5" />
          {cart.length > 0 && (
            <span
              className="text-black text-xs mr-2 flex items-center"
              aria-live="polite"
            >
              {cart.length} کالا <ChevronDown className="ml-1 w-3 h-3" />
            </span>
          )}
          <AnimatePresence>
            {activeDropdown === "cart" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute left-0 top-10 w-80 p-4 rounded-xl bg-white shadow-xl z-50 border border-gray-200"
              >
                {cart.length > 0 ? (
                  <>
                    <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                          <div className="flex flex-col flex-1">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">
                              {item.title}
                            </h3>
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                              <span>{item.quantity} عدد</span>
                              <span>{item.price.toLocaleString()} تومان</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <Link
                        href="/cart"
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-xl transition-all"
                      >
                        مشاهده سبد خرید
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm text-center">
                    سبد خرید خالی است
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
    </>
  );
}
