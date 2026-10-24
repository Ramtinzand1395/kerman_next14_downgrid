"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ZoomIn, Heart, Share2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import useFavoriteStore from "@/stores/favoriteStore";
import ProductImage from "@/app/components/ProductImage";

interface GalleryImage {
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  mainImage: string;
  mainImageAlt?: string;
  images: (GalleryImage | string)[];
  title: string;
  productId: string;
}

export const ProductGallery = ({
  mainImage,
  mainImageAlt,
  images,
  title,
  productId,
}: ProductGalleryProps) => {
  const normalizedImages = useMemo(
    () =>
      images
        .map((img) => (typeof img === "string" ? { url: img, alt: "" } : img))
        .filter((img) => Boolean(img?.url)),
    [images],
  );

  const allImages = [
    { id: 0, url: mainImage, alt: mainImageAlt || title },
    ...normalizedImages.map((img, index) => ({
      id: index + 1,
      url: img.url,
      alt: img.alt || `گالری ${title} - ${index + 1}`,
    })),
  ];

  const [activeImage, setActiveImage] = useState(allImages[0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const { data: session } = useSession();
  const {
    favoriteIds,
    addFavorite,
    removeFavorite,
    loadFavorites,
    clearFavorites,
  } = useFavoriteStore();

  const isFavorite = favoriteIds.includes(productId);

  useEffect(() => {
    setActiveImage(allImages[0]);
  }, [mainImage, mainImageAlt, title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session?.user?.id) {
      clearFavorites();
      return;
    }
    loadFavorites();
  }, [session?.user?.id, loadFavorites, clearFavorites]);

  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.info("برای ذخیره محصول در علاقه‌مندی‌ها، ابتدا وارد حساب شوید.");
      return;
    }
    try {
      if (isFavorite) {
        const res = await fetch("/api/profile/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.status === 401) return toast.info("نشست شما پایان یافته است؛ لطفاً دوباره وارد شوید.");
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          return toast.error(err?.error || "محصول از علاقه‌مندی‌ها حذف نشد؛ دوباره تلاش کنید.");
        }

        removeFavorite(productId);
        toast.success("محصول از علاقه‌مندی‌ها حذف شد.");
      } else {
        const res = await fetch("/api/profile/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.status === 401) return toast.info("برای ادامه، لطفاً وارد حساب شوید.");
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          return toast.error(err?.error || "محصول به علاقه‌مندی‌ها اضافه نشد؛ دوباره تلاش کنید.");
        }

        addFavorite(productId);
        toast.success("محصول به علاقه‌مندی‌ها اضافه شد.");
      }
    } catch (error) {
      console.error("favorite toggle error:", error);
      toast.error("تغییر علاقه‌مندی ذخیره نشد؛ دوباره تلاش کنید.");
    }
  };

  const handleShareProduct = async () => {
    const shareData = {
      title,
      text: `مشاهده محصول ${title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      toast.success("لینک محصول کپی شد؛ اکنون می‌توانید آن را به اشتراک بگذارید.");
    } catch (error) {
      console.error("share product error:", error);
      toast.error("اشتراک‌گذاری انجام نشد؛ لینک صفحه را به‌صورت دستی کپی کنید.");
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <button
          aria-label="Toggle Favorite"
          className="bg-white p-2 rounded-full shadow cursor-pointer"
          onClick={handleToggleFavorite}
        >
          <Heart
            size={18}
            className={
              isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"
            }
          />
        </button>

        <button
          onClick={handleShareProduct}
          className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-500 transition-colors hover:bg-blue-50"
          title="اشتراک‌گذاری"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 mb-4 aspect-square flex items-center justify-center group cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        <ProductImage
          width={1200}
          height={1200}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          src={activeImage.url}
          alt={activeImage.alt || title}
          className={`w-full h-[400px] object-contain transition-transform duration-500 ${
            isZoomed ? "scale-110" : "scale-100"
          }`}
        />
        <div className="absolute bottom-4 left-4 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {allImages.map((img) => (
          <button
            title={img.alt || "thumbnail"}
            key={`${img.url}-${img.id}`}
            onClick={() => setActiveImage(img)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              activeImage.url === img.url
                ? "border-indigo-600 ring-2 ring-indigo-100"
                : "border-transparent hover:border-gray-300"
            }`}
          >
            <ProductImage
              src={img.url}
              alt={img.alt || title}
              fill
              sizes="(max-width: 640px) 25vw, 96px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
