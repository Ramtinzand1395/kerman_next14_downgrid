"use client";

import { useCallback, useRef, useState } from "react";
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

type ProductImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string | null;
};

type ImageState = {
  src: string;
  status: "loading" | "loaded" | "failed";
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
  onLoad,
  onError,
  ...imageProps
}: ProductImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const normalizedAlt = alt?.trim() || "تصویر محصول";
  const isCloudinaryImage = normalizedSrc.startsWith(
    `https://${CLOUDINARY_HOST}/`,
  );
  const latestSrc = useRef(normalizedSrc);
  latestSrc.current = normalizedSrc;
  const [imageState, setImageState] = useState<ImageState>(() => ({
    src: normalizedSrc,
    status: normalizedSrc ? "loading" : "failed",
  }));
  const status =
    imageState.src === normalizedSrc ? imageState.status : "loading";

  const setCurrentStatus = useCallback(
    (nextStatus: ImageState["status"]) => {
      if (latestSrc.current !== normalizedSrc) return;
      setImageState((current) =>
        current.src === normalizedSrc && current.status === nextStatus
          ? current
          : { src: normalizedSrc, status: nextStatus },
      );
    },
    [normalizedSrc],
  );

  const captureImage = useCallback(
    (node: HTMLImageElement | null) => {
      if (
        !node ||
        !node.complete ||
        latestSrc.current !== normalizedSrc
      ) {
        return;
      }

      const nextStatus = node.naturalWidth > 0 ? "loaded" : "failed";
      setImageState((current) =>
        current.src === normalizedSrc && current.status === nextStatus
          ? current
          : { src: normalizedSrc, status: nextStatus },
      );
    },
    [normalizedSrc],
  );

  if (!normalizedSrc || status === "failed") {
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
      key={normalizedSrc}
      {...imageProps}
      ref={captureImage}
      src={normalizedSrc}
      alt={normalizedAlt}
      loader={isCloudinaryImage ? cloudinaryProductLoader : imageProps.loader}
      data-loaded={status === "loaded"}
      className={`product-image-pending ${className}`}
      style={style}
      onLoad={(event) => {
        if (latestSrc.current !== normalizedSrc) return;
        setCurrentStatus(
          event.currentTarget.naturalWidth > 0 ? "loaded" : "failed",
        );
        onLoad?.(event);
      }}
      onError={(event) => {
        if (latestSrc.current !== normalizedSrc) return;
        setCurrentStatus("failed");
        onError?.(event);
      }}
    />
  );
}
