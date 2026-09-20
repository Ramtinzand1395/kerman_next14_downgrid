"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

const CLOUDINARY_HOST = "res.cloudinary.com";
const CLOUDINARY_UPLOAD_PATH = "/image/upload/";

const cloudinaryProductLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps) => {
  try {
    const url = new URL(src);

    if (
      url.hostname !== CLOUDINARY_HOST ||
      !url.pathname.includes(CLOUDINARY_UPLOAD_PATH)
    ) {
      return src;
    }

    url.pathname = url.pathname.replace(
      CLOUDINARY_UPLOAD_PATH,
      `${CLOUDINARY_UPLOAD_PATH}f_auto,q_${quality || 80},c_limit,w_${width}/`,
    );

    return url.toString();
  } catch {
    return src;
  }
};

type ProductImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt?: string | null;
};

/**
 * Renders product media consistently and keeps a broken/missing remote image
 * from leaving an empty box or surfacing an unhandled next/image error.
 */
export default function ProductImage({
  src,
  alt,
  className = "",
  style,
  ...imageProps
}: ProductImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const normalizedAlt = alt?.trim() || "تصویر محصول";
  const isCloudinaryImage = normalizedSrc.startsWith(
    `https://${CLOUDINARY_HOST}/`,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || failed) {
    return (
      <div
        role="img"
        aria-label={normalizedAlt}
        className={`${imageProps.fill ? "absolute inset-0" : ""} flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        style={style}
      >
        <ImageOff aria-hidden="true" className="h-1/3 w-1/3 max-h-10 max-w-10" />
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      src={normalizedSrc}
      alt={normalizedAlt}
      loader={isCloudinaryImage ? cloudinaryProductLoader : imageProps.loader}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
