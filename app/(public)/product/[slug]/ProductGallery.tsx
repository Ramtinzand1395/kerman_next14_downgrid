"use client";
import React, { useState } from "react";
import { ZoomIn, Heart, Share2 } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { ProductImage } from "@/types";

interface ProductGalleryProps {
  mainImage: string;
  images: ProductImage[];
  title: string;
  productId: number;
}

export const ProductGallery = ({
  mainImage,
  images,
  title,
  productId,
}: ProductGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage);
  const [isZoomed, setIsZoomed] = useState(false);
  const { data: session } = useSession();

  // Combine main image with gallery images for the list, filtering duplicates if necessary
  const allImages = [{ id: 0, url: mainImage, productId: 0 }, ...images];
  const [isFavorite, setIsFavorite] = useState(false);
  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.error("برای افزودن به علاقه‌مندی ابتدا وارد شوید.");
      return;
    }

    try {
      if (isFavorite) {
        // حذف
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.status === 401) {
          toast.error("لطفاً دوباره وارد شوید.");
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(err?.error || "خطا در حذف از علاقه‌مندی‌ها");
          return;
        }

        setIsFavorite(false);
        toast.info("از علاقه‌مندی‌ها حذف شد ❌");
      } else {
        // افزودن
        const res = await fetch("/api/favorites", {
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

        setIsFavorite(true);
        toast.success("به علاقه‌مندی‌ها اضافه شد ❤️");
      }
    } catch (error) {
      console.error("favorite toggle error:", error);
      toast.error("خطایی رخ داد");
    }
  };
  return (
    <div className="relative">
      {/* Actions Overlay */}
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
          className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-500 transition-colors hover:bg-blue-50"
          title="اشتراک‌گذاری"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image */}
      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 mb-4 aspect-square flex items-center justify-center group cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        <Image
          width={200}
          height={100}
          src={activeImage}
          alt={title}
          className={`w-full h-[400px] object-contain transition-transform duration-500 ${
            isZoomed ? "scale-110" : "scale-100"
          }`}
        />
        <div className="absolute bottom-4 left-4 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-5 h-5" />
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-5 gap-2">
        {allImages.map((img, index) => (
          <button
            title="activeImage"
            key={`${img.id}-${index}`}
            onClick={() => setActiveImage(img.url)}
            className={`
              relative aspect-square rounded-lg overflow-hidden border-2 transition-all
              ${
                activeImage === img.url
                  ? "border-indigo-600 ring-2 ring-indigo-100"
                  : "border-transparent hover:border-gray-300"
              }
            `}
          >
            <Image
              width={50}
              height={50}
              src={img.url}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
