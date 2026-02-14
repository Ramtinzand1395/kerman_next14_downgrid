"use client";
// todo
// از لیست حذف نمیشه با دکمه قلب 
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import Cart from "../components/Cart";
import { Product } from "@/types";
import SkeletonLoading from "../components/SkeletonLoading";

interface Favorite {
  _id: string;
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
    <section>
      <div className="mb-4 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-rose-100 p-2 text-rose-600">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 sm:text-lg">
                لیست علاقه‌مندی‌ها
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                محصولات محبوب خود را مدیریت کنید.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm sm:text-sm">
            {favorites.length} محصول
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoading key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500 sm:text-base">
          هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((product) => (
            <article
              key={product._id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Cart game={product.productId} />
              <button
                onClick={() => removeFavorite(product.productId._id)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 sm:text-sm"
              >
                <Trash2 className="h-4 w-4" />
                حذف از علاقه‌مندی‌ها
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
