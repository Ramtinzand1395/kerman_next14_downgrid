import { CartItem, CartStoreStateType } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// hi
interface CartStoreActionsType {
  addToCart: (
    product: Partial<CartItem> & {
      id: string;
      title: string;
      price: number;
      image: string;
      discountPrice: number | null;
    }
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
          const existingIndex = state.cart.findIndex(
            (p) => p.id === product.id
          );

          if (existingIndex !== -1) {
            const updatedCart = [...state.cart];
            updatedCart[existingIndex].quantity += product.quantity || 1;
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
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        })),

      decreaseQty: (id) =>
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.id === id ? { ...item, quantity: item.quantity - 1 } : item
            )
            .filter((item) => item.quantity > 0),
        })),

      removeFromCart: (product) =>
        set((state) => ({
          cart: state.cart.filter((p) => !(p.id === product.id)),
        })),
      clearCart: () => set({ cart: [] }),
    }),

    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

export default useCartStore;
