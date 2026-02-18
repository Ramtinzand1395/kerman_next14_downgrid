import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeJSONStorage } from "./safeStorage";
interface FavoriteStoreState {
  favoriteIds: string[];
  hasHydrated: boolean;
  isLoaded: boolean;
  isSyncing: boolean;
}

interface FavoriteStoreActions {
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  setFavorites: (ids: string[]) => void;
  clearFavorites: () => void;
  loadFavorites: () => Promise<void>;
}

type FavoriteStore = FavoriteStoreState & FavoriteStoreActions;

const useFavoriteStore = create<FavoriteStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      hasHydrated: false,
      isLoaded: false,
      isSyncing: false,

      addFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds
            : [...state.favoriteIds, id],
        })),

      removeFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.filter((favId) => favId !== id),
        })),

      setFavorites: (ids) =>
        set({
          favoriteIds: Array.from(new Set(ids)),
          isLoaded: true,
        }),

      clearFavorites: () =>
        set({
          favoriteIds: [],
          isLoaded: false,
        }),

      loadFavorites: async () => {
        if (get().isLoaded || get().isSyncing) {
          return;
        }

        set({ isSyncing: true });

        try {
          const res = await fetch("/api/profile/favorites", { method: "GET" });

          if (!res.ok) {
            return;
          }

          const data = await res.json();
          const ids = Array.isArray(data)
            ? data
                .map((item) => item?.productId?._id ?? item?.productId)
                .filter(Boolean)
                .map((id) => String(id))
            : [];

          set({
            favoriteIds: Array.from(new Set(ids)),
            isLoaded: true,
          });
        } catch (error) {
          console.error("loadFavorites error:", error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "favorites",
        storage: createJSONStorage(() => safeJSONStorage),
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

export default useFavoriteStore;
