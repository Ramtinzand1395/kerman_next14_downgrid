"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import useCartStore from "@/stores/cartStore";
import { Comment, Product } from "@/types";
import useFavoriteStore from "@/stores/favoriteStore";

interface CartProps {
  game: Product;
  onFavoriteChange?: (isFavorite: boolean, productId: string) => void;
}

export default function Cart({ game, onFavoriteChange }: CartProps) {
  const { addToCart } = useCartStore();
  const { data: session } = useSession();
  // const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const {
    favoriteIds,
    addFavorite,
    removeFavorite,
    loadFavorites,
    clearFavorites,
  } = useFavoriteStore();

  const isFavorite = favoriteIds.includes(game._id);
  useEffect(() => {
    if (!session?.user?.id) {
      clearFavorites();

      return;
    }
    loadFavorites();
  }, [session?.user?.id, loadFavorites, clearFavorites]);

  const finalPrice = game.discountPrice ?? game.price;
  const hasDiscount =
    typeof game.discountPrice === "number" && game.discountPrice < game.price;
  const discountPercentage = hasDiscount
    ? Math.round(((game.price - finalPrice) / game.price) * 100)
    : 0;

  const rating = useMemo(() => {
    if (!game.comments?.length) {
      return 0;
    }

    const total = game.comments.reduce(
      (sum: number, item: Comment) => sum + item.rating,
      0,
    );

    return total / game.comments.length;
  }, [game.comments]);

  const handleAddToCart = () => {
    addToCart({
      id: game._id,
      title: game.title,
      price: game.price,
      discountPrice: game.discountPrice ?? null,
      image: game.mainImage,
      quantity: 1,
    });

    toast.success("به سبد خرید اضافه شد.");
  };

  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.error("برای افزودن به علاقه‌مندی ابتدا وارد شوید.");
      return;
    }

    if (favoriteLoading) {
      return;
    }

    setFavoriteLoading(true);

    try {
      const method = isFavorite ? "DELETE" : "POST";

      const res = await fetch("/api/profile/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: game._id }),
      });

      if (res.status === 401) {
        toast.error("لطفاً وارد شوید.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(
          err?.error ||
            (isFavorite
              ? "خطا در حذف از علاقه‌مندی‌ها"
              : "خطا در افزودن به علاقه‌مندی‌ها"),
        );
        return;
      }

      const nextIsFavorite = !isFavorite;

      if (isFavorite) {
        removeFavorite(game._id);
      } else {
        addFavorite(game._id);
      }

      onFavoriteChange?.(nextIsFavorite, game._id);

      toast.success(
        isFavorite
          ? "از علاقه‌مندی‌ها حذف شد."
          : "به علاقه‌مندی‌ها اضافه شد ❤️",
      );
    } catch (error) {
      console.error("favorite toggle error:", error);
      toast.error("خطایی رخ داد.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      itemScope
      itemType="https://schema.org/Product"
    >
      <div className="relative">
        <Link
          href={`/product/${game.slug}`}
          aria-label={`مشاهده جزئیات ${game.title}`}
          itemProp="url"
          className="block"
        >
          <div className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-50">
            <Image
              src={game.mainImage}
              alt={game.title}
              width={320}
              height={180}
              loading="lazy"
              itemProp="image"
              className="h-28 w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>

        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={favoriteLoading}
          aria-label={isFavorite ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 shadow transition hover:scale-105 disabled:cursor-not-allowed"
        >
          <Heart
            size={18}
            className={
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            }
          />
        </button>

        {hasDiscount && (
          <div className="absolute left-3 top-3 z-20 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
            %{discountPercentage}-
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col text-start">
        <h2
          className="line-clamp-2 min-h-[44px] text-sm font-semibold text-gray-900"
          itemProp="name"
        >
          {game.title}
        </h2>

        <div
          className="mt-2"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <meta itemProp="priceCurrency" content="IRR" />
          <meta itemProp="price" content={finalPrice.toString()} />

          {hasDiscount ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#001A6E] md:text-base">
                {finalPrice.toLocaleString()} تومان
              </span>
              <span className="text-xs text-gray-400 line-through">
                {game.price.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-[#001A6E] md:text-base">
              {game.price.toLocaleString()} تومان
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              size={14}
              className={
                value <= Math.round(rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }
            />
          ))}
          <span>{game.comments?.length ? rating.toFixed(1) : "0.0"}</span>
          <span>({game.comments?.length || 0} نظر)</span>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.01 }}
        onClick={handleAddToCart}
        className="mt-4 inline-flex text-xs items-center justify-center gap-2 rounded-lg bg-[#377dff] py-2.5 md:text-sm font-medium text-white transition-colors hover:bg-[#2b67d5] focus:outline-none focus:ring-2 focus:ring-[#377dff]/40"
        aria-label={`افزودن ${game.title} به سبد خرید`}
      >
        <ShoppingCart size={16} />
        افزودن به سبد خرید
      </motion.button>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: game.title,
            image: [game.mainImage],
            description: game.shortDesc,
            sku: game.sku || undefined,
            brand: game.brand
              ? {
                  "@type": "Brand",
                  name: game.brand,
                }
              : undefined,
            offers: {
              "@type": "Offer",
              url: `https://yourdomain.com/product/${game.slug}`,
              priceCurrency: "IRR",
              price: finalPrice,
              availability: "https://schema.org/InStock",
            },
            aggregateRating: game.comments?.length
              ? {
                  "@type": "AggregateRating",
                  ratingValue: Number(rating.toFixed(1)),
                  reviewCount: game.comments.length,
                }
              : undefined,
          }),
        }}
      />
    </article>
  );
}
