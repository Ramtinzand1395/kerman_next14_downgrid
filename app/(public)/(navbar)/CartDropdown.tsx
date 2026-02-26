"use client";

import { memo, useMemo } from "react";
import useCartStore from "@/stores/cartStore";
import { CartItem } from "@/types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type DropdownType = "user" | "cart" | null;

interface CartDropdownProps {
  setActiveDropdown: React.Dispatch<React.SetStateAction<DropdownType>>;
  activeDropdown: DropdownType;
}

const getFinalUnitPrice = (item: CartItem) => {
  if (typeof item.discountPrice === "number" && item.discountPrice < item.price) {
    return item.discountPrice;
  }

  return item.price;
};

const CartPreviewItem = memo(function CartPreviewItem({
  item,
}: {
  item: CartItem;
}) {
  const unitFinalPrice = getFinalUnitPrice(item);
  const hasDiscount = unitFinalPrice < item.price;
  const lineTotal = unitFinalPrice * item.quantity;
  const originalLineTotal = item.price * item.quantity;
const displayTitle = item.variantTitle || item.title;
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <Image
        src={item.image}
        alt={displayTitle}
        width={56}
        height={56}
        className="h-14 w-14 rounded-lg border border-slate-100 object-cover"
        loading="lazy"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">   {displayTitle}</p>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{item.quantity} عدد</span>
          <div className="flex flex-col items-end">
            <span className="font-semibold text-slate-700">
              {lineTotal.toLocaleString()} تومان
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-slate-400 line-through">
                {originalLineTotal.toLocaleString()} تومان
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

export default function CartDropdown({
  setActiveDropdown,
  activeDropdown,
}: CartDropdownProps) {
  const shouldReduceMotion = useReducedMotion();
  const cart = useCartStore((state) => state.cart);

  const { itemsCount, totalPrice, originalTotalPrice } = useMemo(
    () =>
      cart.reduce(
        (acc, item) => {
          const unitFinalPrice = getFinalUnitPrice(item);

          acc.itemsCount += item.quantity;
          acc.totalPrice += unitFinalPrice * item.quantity;
          acc.originalTotalPrice += item.price * item.quantity;
          return acc;
        },
        { itemsCount: 0, totalPrice: 0, originalTotalPrice: 0 },
      ),
    [cart],
  );

  const hasItems = cart.length > 0;
  const dropdownVisible = activeDropdown === "cart";
  const hasDiscountedTotal = totalPrice < originalTotalPrice;

  return (
    <div
      className="relative"
      onMouseEnter={() => setActiveDropdown("cart")}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <Link
        aria-label="سبد خرید"
        href="/cart"
        className="group relative flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition-colors hover:border-slate-300 md:border-0 md:bg-transparent md:px-0 md:py-0"
      >
        <ShoppingBag className="h-4 w-4 text-slate-900" />

        {hasItems && (
          <span
            className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white"
            aria-live="polite"
          >
            {itemsCount}
          </span>
        )}

        {hasItems && (
          <ChevronDown className="ml-1 hidden h-3 w-3 text-slate-500 transition-transform group-hover:rotate-180 md:block" />
        )}
      </Link>

      <AnimatePresence>
        {dropdownVisible && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-10 z-50 hidden w-[22rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:block"
          >
            {hasItems ? (
              <>
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-sm font-semibold text-slate-800">سبد خرید شما</p>
                  <p className="text-xs text-slate-500">{itemsCount.toLocaleString()} کالا</p>
                </div>

                <ul className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 max-h-72 space-y-3 overflow-y-auto pl-1">
                  {cart.map((item) => (
                    <CartPreviewItem key={item.id ?? item.sku} item={item} />
                  ))}
                </ul>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">مجموع</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-800">
                        {totalPrice.toLocaleString()} تومان
                      </span>
                      {hasDiscountedTotal && (
                        <span className="text-xs text-slate-400 line-through">
                          {originalTotalPrice.toLocaleString()} تومان
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/cart"
                    className="block w-full rounded-xl bg-blue-900 py-2.5 text-center text-sm text-white transition-colors hover:bg-blue-700"
                  >
                    رفتن به سبد خرید
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">سبد خرید شما هنوز خالی است</p>
                <Link
                  href="/shop"
                  className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  شروع خرید
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}