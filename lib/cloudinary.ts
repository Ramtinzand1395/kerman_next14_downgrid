import { v2 as cloudinary } from "cloudinary";

import Blog from "@/model/Blog";
import Product from "@/model/Product";

type DeletionContext = {
  excludeBlogId?: string;
  excludeProductId?: string;
};

const getCloudName = () =>
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  "";

const configureCloudinary = () => {
  const cloudName = getCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary server credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
};

/**
 * Extracts the public ID from the original secure_url returned by an unsigned
 * Cloudinary image upload. Non-Cloudinary URLs are intentionally ignored.
 */
export const getCloudinaryPublicId = (value: string) => {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const imageIndex = parts.indexOf("image");
    const uploadIndex = parts.indexOf("upload", imageIndex + 1);

    if (
      url.hostname !== "res.cloudinary.com" ||
      imageIndex < 1 ||
      uploadIndex === -1 ||
      parts[imageIndex - 1] !== getCloudName()
    ) {
      return null;
    }

    const versionIndex = parts.findIndex(
      (part, index) => index > uploadIndex && /^v\d+$/.test(part),
    );
    const publicIdParts = parts.slice(
      versionIndex === -1 ? uploadIndex + 1 : versionIndex + 1,
    );

    if (!publicIdParts.length) return null;

    const filename = publicIdParts.at(-1);
    if (!filename) return null;

    publicIdParts[publicIdParts.length - 1] = filename.replace(/\.[^.]+$/, "");
    return decodeURIComponent(publicIdParts.join("/"));
  } catch {
    return null;
  }
};

const isReferencedElsewhere = async (
  url: string,
  { excludeBlogId, excludeProductId }: DeletionContext,
) => {
  const productFilter: Record<string, unknown> = {
    $or: [{ mainImage: url }, { "images.url": url }, { images: url }],
  };
  const blogFilter: Record<string, unknown> = { coverImage: url };

  if (excludeProductId) productFilter._id = { $ne: excludeProductId };
  if (excludeBlogId) blogFilter._id = { $ne: excludeBlogId };

  const [productReference, blogReference] = await Promise.all([
    Product.exists(productFilter),
    Blog.exists(blogFilter),
  ]);

  return Boolean(productReference || blogReference);
};

/**
 * Deletes Cloudinary images only when no other product or blog references the
 * same URL. Duplicate and non-Cloudinary URLs are safely ignored.
 */
export const deleteUnusedCloudinaryImages = async (
  values: Array<string | null | undefined>,
  context: DeletionContext = {},
) => {
  const assets = Array.from(
    new Map(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((url) => [url, getCloudinaryPublicId(url)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    ).entries(),
  );

  if (!assets.length) return;

  configureCloudinary();

  for (const [url, publicId] of assets) {
    if (await isReferencedElsewhere(url, context)) continue;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(
        `Cloudinary could not delete image "${publicId}" (${result.result}).`,
      );
    }
  }
};
