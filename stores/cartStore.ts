import { CartItem, CartStoreStateType } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeJSONStorage } from "./safeStorage";
import { subtractPurchasedItems } from "@/lib/cartReconciliation";
import { trackCommerce } from "@/lib/analytics/browser";
import { cartAnalyticsLine } from "@/lib/analytics/ecommerce";
interface CartStoreActionsType {
  addToCart: (
    product: Partial<CartItem> & {
      id: string;
      productId: string;
      title: string;
      productTitle?: string;
      price: number;
      image: string;
      discountPrice: number | null;
      stock?: number;
      variantId?: string;
      variantTitle?: string;
      sku?: string;
    },
  ) => "added" | "out_of_stock" | "max_reached";
  removeFromCart: (product: Partial<CartItem>) => void;
  clearCart: () => void;
  removePurchasedItems: (
    items: Array<{ productId: string; variantId?: string | null; quantity: number }>,
  ) => void;

  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
}

const useCartStore = create<CartStoreActionsType & CartStoreStateType>()(
  persist(
    (set, get) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product) => {
        const previousQuantity = get().cart.find((item) => item.id === product.id)?.quantity ?? 0;
        let status: "added" | "out_of_stock" | "max_reached" = "added";
        set((state) => {
          if ((product.stock ?? 1) <= 0) {
            status = "out_of_stock";
            return state;
          }

          const existingIndex = state.cart.findIndex(
            (p) => p.id === product.id,
          );

          if (existingIndex !== -1) {
            const updatedCart = [...state.cart];
            const currentItem = updatedCart[existingIndex];
            const nextQty = currentItem.quantity + (product.quantity || 1);
            const maxQty =
              typeof currentItem.stock === "number"
                ? currentItem.stock
                : typeof product.stock === "number"
                  ? product.stock
                  : nextQty;
            if (currentItem.quantity >= maxQty) {
              status = "max_reached";
              return state;
            }
            updatedCart[existingIndex] = { ...currentItem, quantity: Math.min(nextQty, maxQty) };
            return { cart: updatedCart };
          }

          return {
            cart: [
              ...state.cart,
              {
                ...product,
                quantity: product.quantity || 1,
              },
            ],
          };
        });

        const updatedItem = get().cart.find((item) => item.id === product.id);
        if (updatedItem && updatedItem.quantity > previousQuantity) {
          trackCommerce("add_to_cart", [cartAnalyticsLine(updatedItem, updatedItem.quantity - previousQuantity)]);
        }
        return status;
      },
      increaseQty: (id) => {
        const previousItem = get().cart.find((item) => item.id === id);
        if (!previousItem) return;
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id !== id) {
              return item;
            }

            const maxQty =
              typeof item.stock === "number" ? item.stock : item.quantity + 1;

            return { ...item, quantity: Math.min(item.quantity + 1, maxQty) };
          }),
        }));
        const updatedItem = get().cart.find((item) => item.id === id);
        if (updatedItem && updatedItem.quantity > previousItem.quantity) {
          trackCommerce("add_to_cart", [cartAnalyticsLine(updatedItem, updatedItem.quantity - previousItem.quantity)]);
        }
      },

      decreaseQty: (id) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(1, item.quantity - 1) }
              : item,
          ),
        })),

      removeFromCart: (product) =>
        set((state) => ({
          cart: state.cart.filter((p) => !(p.id === product.id)),
        })),
      clearCart: () => set({ cart: [] }),
      removePurchasedItems: (purchasedItems) =>
        set((state) => ({
          cart: subtractPurchasedItems(state.cart, purchasedItems),
        })),
    }),

    {
      name: "cart",
      storage: createJSONStorage(() => safeJSONStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

export default useCartStore;
