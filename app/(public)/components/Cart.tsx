"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import useCartStore from "@/stores/cartStore";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { Comment, Product } from "@/types";
// import { Product } from "@prisma/client";

interface CartProps {
  game: Product;
}

export default function Cart({ game }: CartProps) {
  const { addToCart } = useCartStore();
  const { data: session } = useSession();

  const handleAddToCart = () => {
    // todo
    addToCart({
      id: game._id!.toLocaleString(),
      title: game.title,
      price: game.price,
      discountPrice: game.discountPrice || null,
      image: game.mainImage,
      quantity: 1,
    });

    toast.success("به سبد خرید اضافه شد.");
  };

  const discountPercentage = game.discountPrice
    ? Math.round(((game.price - game.discountPrice) / game.price) * 100)
    : 0;
  // داخل همان فایل Cart کامپوننت — فقط توابع زیر را جایگزین کنید
// todo
// قلب قرمز بشه و حذف بشه از لیست
// بهم ریخته میشه در علاقه مندی ها
  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.error("برای افزودن به علاقه‌مندی ابتدا وارد شوید.");
      return;
    }

    const productId = game._id;

    try {
      const res = await fetch("/api/users_data/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        toast.error("لطفاً وارد شوید.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "خطا در افزودن به علاقه‌مندی‌ها");
        return;
      }

      toast.success("به علاقه‌مندی‌ها اضافه شد ❤️");
    } catch (error) {
      console.error("favorite toggle error:", error);
      toast.error("خطایی رخ داد");
    }
  };
// todo
// یکجا باشه
  const rating = game.comments?.length
    ? game.comments.reduce((t: number, c: Comment) => t + c.rating, 0) /
      game.comments.length
    : 0;
  return (
    <article
      className="relative group w-full h-auto rounded-2xl cursor-pointer "
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* تصویر محصول */}{" "}
      <Link
        href={`/product/${game.slug}`}
        aria-label={`مشاهده جزئیات ${game.title}`}
        itemProp="url"
      >
        <div className="w-full relative h-42 flex items-center justify-center rounded-lg bg-gray-200">
          <Image
            src={game.mainImage}
            alt={game.title}
            width={200}
            height={100}
            className="object-contain w-full h-20 hover:scale-105 transition-all ease-in-out duration-200"
            loading="lazy" // ✅ بهبود سرعت لود
            itemProp="image"
          />
        </div>{" "}
      </Link>
      {/* دکمه افزودن به سبد خرید */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={handleAddToCart}
        className=" z-20 bottom-0 left-0 w-full bg-[#377dff] rounded-md text-white text-sm py-2 md:opacity-0 opacity-100 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-400"
        aria-label={`افزودن ${game.title} به سبد خرید`}
      >
        افزودن به سبد خرید
      </motion.button>
      {/* آیکون‌ها */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-40  ">
        <button
          aria-label="Toggle Favorite"
          className="bg-white p-2 rounded-full shadow cursor-pointer"
          onClick={handleToggleFavorite}
        >
          <Heart size={18} />
        </button>
      </div>
      {/* لینک محصول */}
      {/* تخفیف */}
      {game.discountPrice !== null && (
        <div
          className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-20"
          aria-label={`تخفیف ${discountPercentage}%`}
        >
          -{discountPercentage}%
        </div>
      )}
      {/* مشخصات محصول */}
      <div
        className="mt-2 text-start"
        itemProp="offers"
        itemScope
        itemType="https://schema.org/Offer"
      >
        <h2 className="font-semibold line-clamp-2" itemProp="name">
          {game.title}
        </h2>

        {/* قیمت محصول */}
        <div
          className="text-gray-800 font-medium mt-1"
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          {/* قیمت برای سئو */}
          <meta itemProp="priceCurrency" content="IRR" />
          <meta
            itemProp="price"
            content={(game.discountPrice || game.price).toString()}
          />

          {game.discountPrice ? (
            <div className="flex items-center justify-between">
              <span className="text-[#001A6E] font-bold">
                {game.discountPrice.toLocaleString()} تومان
              </span>

              <span className="line-through text-gray-400 text-xs">
                {game.price.toLocaleString()}
              </span>
            </div>
          ) : (
            <span>{`${game.price.toLocaleString()} تومان`}</span>
          )}
        </div>

        {/* امتیاز و ستاره‌ها */}

        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`text-lg ${
                rating >= i ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </span>
          ))}
          <span className="text-gray-500">
            {game.comments?.length ? rating.toFixed(1) : "بدون امتیاز"}
          </span>
          <span className="text-gray-400">
            ({game.comments?.length || 0} نظر)
          </span>
        </div>
      </div>
      {/* Structured Data JSON-LD */}
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
            brand: {
              "@type": "Brand",
              name: game.brand,
            },
            offers: {
              "@type": "Offer",
              url: `https://yourdomain.com/product/${game.slug}`,
              priceCurrency: "IRR",
              price: game.discountPrice || game.price,
              availability: "https://schema.org/InStock",
            },
            aggregateRating: game.comments.length
              ? {
                  "@type": "AggregateRating",
                  ratingValue: rating,
                  reviewCount: game.comments.length,
                }
              : undefined,
          }),
        }}
      />
    </article>
  );
}
