"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || failed) {
    const fallbackStyle = imageProps.fill
      ? style
      : {
          ...style,
          width: imageProps.width,
          height: imageProps.height,
        };

    return (
      <div
        role="img"
        aria-label={normalizedAlt}
        className={`${imageProps.fill ? "absolute inset-0" : ""} flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        style={fallbackStyle}
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
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
