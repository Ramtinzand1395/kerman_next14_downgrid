import { CartItem, CartStoreStateType } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeJSONStorage } from "./safeStorage";
interface CartStoreActionsType {
  addToCart: (
    product: Partial<CartItem> & {
      id: string;
      title: string;
      price: number;
      image: string;
      discountPrice: number | null;
      stock?: number;
    },
  ) => void;
  removeFromCart: (product: Partial<CartItem>) => void;
  clearCart: () => void;

  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
}

const useCartStore = create<CartStoreActionsType & CartStoreStateType>()(
  persist(
    (set) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product) =>
        set((state) => {
           if ((product.stock ?? 1) <= 0) {
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
 
             updatedCart[existingIndex].quantity = Math.min(nextQty, maxQty);
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
        }),
      increaseQty: (id) =>
        set((state) => ({
          cart: state.cart.map((item) => {
           if (item.id !== id) {
              return item;
             }
 
             const maxQty =
               typeof item.stock === "number" ? item.stock : item.quantity + 1;
 
             return { ...item, quantity: Math.min(item.quantity + 1, maxQty) };
          }),
        })),

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
