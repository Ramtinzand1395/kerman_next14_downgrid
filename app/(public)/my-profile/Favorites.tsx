"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Cart from "../components/Cart";
import { Product } from "@/types";
import SkeletonLoading from "../components/SkeletonLoading";

interface Favorite {
  _id: string; // favoriteId
  userId: string;
  productId: Product;
  createdAt: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const [loading, setLoading] = useState(false);

  const getFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/favorites", { method: "GET" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err?.error || "خطا در دریافت علاقه‌مندی‌ها");
        return;
      }
      const data = await res.json();
      setFavorites(data);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت علاقه‌مندی‌ها");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId: string) => {
    setLoading(true);

    try {
      const res = await fetch("/api/profile/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err?.error || "خطا در حذف محصول");
        return;
      }

      setFavorites((prev) => prev.filter((p) => p.productId._id !== productId));

      toast.info("محصول از علاقه‌مندی‌ها حذف شد");
    } catch (err) {
      console.error(err);
      toast.error("خطا در حذف محصول");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFavorites();
  }, []);
  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {loading &&
        Array.from({ length: 8 }).map((_, i) => <SkeletonLoading key={i} />)}
      {favorites.length === 0 ? (
        <div className="col-span-full text-center p-8 text-gray-500">
          هیچ محصولی در علاقه‌مندی‌ها وجود ندارد.
        </div>
      ) : (
        favorites.map((product) => (
          <div
            key={product._id}
            className="border rounded-lg p-2 hover:shadow-lg transition relative bg-white flex flex-col"
          >
            <Cart game={product.productId} />
            <button
              onClick={() => removeFavorite(product.productId._id)}
              className=" bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition"
            >
              حذف
            </button>
          </div>
        ))
      )}
    </div>
  );
}
