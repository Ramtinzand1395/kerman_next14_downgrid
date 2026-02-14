// "use client";

// import { Heart } from "lucide-react";
// import Image from "next/image";
// import { motion } from "framer-motion";
// import Link from "next/link";
// import useCartStore from "@/stores/cartStore";
// import { toast } from "react-toastify";
// import { useSession } from "next-auth/react";
// import { Comment, Product } from "@/types";

// interface CartProps {
//   game: Product;
// }

// export default function Cart({ game }: CartProps) {
//   const { addToCart } = useCartStore();
//   const { data: session } = useSession();

//   const handleAddToCart = () => {
//     addToCart({
//       id: game._id!.toLocaleString(),
//       title: game.title,
//       price: game.price,
//       discountPrice: game.discountPrice || null,
//       image: game.mainImage,
//       quantity: 1,
//     });

//     toast.success("به سبد خرید اضافه شد.");
//   };

//   const discountPercentage = game.discountPrice
//     ? Math.round(((game.price - game.discountPrice) / game.price) * 100)
//     : 0;
//   // داخل همان فایل Cart کامپوننت — فقط توابع زیر را جایگزین کنید
//   // todo
//   // قلب قرمز بشه و حذف بشه از لیست
//   // بهم ریخته میشه در علاقه مندی ها
//   const handleToggleFavorite = async () => {
//     if (!session?.user?.id) {
//       toast.error("برای افزودن به علاقه‌مندی ابتدا وارد شوید.");
//       return;
//     }

//     const productId = game._id;

//     try {
//       const res = await fetch("/api/profile/favorites", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ productId }),
//       });

//       if (res.status === 401) {
//         toast.error("لطفاً وارد شوید.");
//         return;
//       }

//       if (!res.ok) {
//         const err = await res.json().catch(() => null);
//         toast.error(err?.error || "خطا در افزودن به علاقه‌مندی‌ها");
//         return;
//       }

//       toast.success("به علاقه‌مندی‌ها اضافه شد ❤️");
//     } catch (error) {
//       console.error("favorite toggle error:", error);
//       toast.error("خطایی رخ داد");
//     }
//   };
//   // todo
//   // یکجا باشه
//   const rating = game.comments?.length
//     ? game.comments.reduce((t: number, c: Comment) => t + c.rating, 0) /
//       game.comments.length
//     : 0;
//   return (
//     <article
//       className="relative group w-full h-auto rounded-2xl cursor-pointer "
//       itemScope
//       itemType="https://schema.org/Product"
//     >
//       {/* تصویر محصول */}{" "}
//       <Link
//         href={`/product/${game.slug}`}
//         aria-label={`مشاهده جزئیات ${game.title}`}
//         itemProp="url"
//       >
//         <div className="w-full relative h-[200px] flex items-center justify-center rounded-lg bg-gray-200">
//           <Image
//             src={game.mainImage}
//             alt={game.title}
//             width={200}
//             height={100}
//             className="object-contain w-full h-20 hover:scale-105 transition-all ease-in-out duration-200"
//             loading="lazy" // ✅ بهبود سرعت لود
//             itemProp="image"
//           />
//         </div>{" "}
//       </Link>
//       {/* دکمه افزودن به سبد خرید */}
//       <motion.button
//         whileHover={{ scale: 1.05 }}
//         onClick={handleAddToCart}
//         className=" z-20 bottom-0 left-0 w-full text-xs md:text-sm bg-[#377dff] rounded-md text-white  py-2 md:opacity-0 opacity-100 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-400"
//         aria-label={`افزودن ${game.title} به سبد خرید`}
//       >
//         افزودن به سبد خرید
//       </motion.button>
//       {/* آیکون‌ها */}
//       <div className="absolute top-3 right-3 flex flex-col gap-2 z-40  ">
//         <button
//           aria-label="Toggle Favorite"
//           className="bg-white p-2 rounded-full shadow cursor-pointer"
//           onClick={handleToggleFavorite}
//         >
//           <Heart size={18} />
//         </button>
//       </div>
//       {/* لینک محصول */}
//       {/* تخفیف */}
//       {game.discountPrice !== null && (
//         <div
//           className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-20"
//           aria-label={`تخفیف ${discountPercentage}%`}
//         >
//           -{discountPercentage}%
//         </div>
//       )}
//       {/* مشخصات محصول */}
//       <div
//         className="mt-2 text-start"
//         itemProp="offers"
//         itemScope
//         itemType="https://schema.org/Offer"
//       >
//         <h2 className="font-semibold line-clamp-2" itemProp="name">
//           {game.title}
//         </h2>

//         {/* قیمت محصول */}
//         <div
//           className="text-gray-800 font-medium mt-1"
//           itemProp="offers"
//           itemScope
//           itemType="https://schema.org/Offer"
//         >
//           {/* قیمت برای سئو */}
//           <meta itemProp="priceCurrency" content="IRR" />
//           <meta
//             itemProp="price"
//             content={(game.discountPrice || game.price).toString()}
//           />

//           {game.discountPrice ? (
//             <div className="flex items-center justify-between">
//               <span className="text-[#001A6E] font-bold">
//                 {game.discountPrice.toLocaleString()} تومان
//               </span>

//               <span className="line-through text-gray-400 text-xs">
//                 {game.price.toLocaleString()}
//               </span>
//             </div>
//           ) : (
//             <span className="text-xs md:text-sm">{`${game.price.toLocaleString()} تومان`}</span>
//           )}
//         </div>

//         {/* امتیاز و ستاره‌ها */}

//         <div className="flex items-center gap-1 text-sm">
//           {[1, 2, 3, 4, 5].map((i) => (
//             <span
//               key={i}
//               className={`text-lg ${
//                 rating >= i ? "text-yellow-400" : "text-gray-300"
//               }`}
//             >
//               ★
//             </span>
//           ))}
//           <span className="text-gray-500 text-xs ">
//             {game.comments?.length ? rating.toFixed(1) : ""}
//           </span>
//           <span className="text-gray-400 text-xs ">
//             ({game.comments?.length || 0} نظر)
//           </span>
//         </div>
//       </div>
//       {/* Structured Data JSON-LD */}
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify({
//             "@context": "https://schema.org/",
//             "@type": "Product",
//             name: game.title,
//             image: [game.mainImage],
//             description: game.shortDesc,
//             sku: game.sku || undefined,
//             brand: {
//               "@type": "Brand",
//               name: game.brand,
//             },
//             offers: {
//               "@type": "Offer",
//               url: `https://yourdomain.com/product/${game.slug}`,
//               priceCurrency: "IRR",
//               price: game.discountPrice || game.price,
//               availability: "https://schema.org/InStock",
//             },
//             aggregateRating: game.comments.length
//               ? {
//                   "@type": "AggregateRating",
//                   ratingValue: rating,
//                   reviewCount: game.comments.length,
//                 }
//               : undefined,
//           }),
//         }}
//       />
//     </article>
//   );
// }
// todo
// اضافه و کم کردن در لیست علاقه مندی ها مشکل داره علاقه مندی در لوکال استورج ذخیره بشه و باهاش کار بشه قلب رنگش ثابت بمونه و تغییرر کنه در همه جا
// بعد از ادیت
"use client";

import { useMemo, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

import useCartStore from "@/stores/cartStore";
import { Comment, Product } from "@/types";

interface CartProps {
  game: Product;
}

export default function Cart({ game }: CartProps) {
  const { addToCart } = useCartStore();
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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
      0
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
              : "خطا در افزودن به علاقه‌مندی‌ها")
        );
        return;
      }

      setIsFavorite((prev) => !prev);
      toast.success(
        isFavorite ? "از علاقه‌مندی‌ها حذف شد." : "به علاقه‌مندی‌ها اضافه شد ❤️"
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
            className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"}
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
