import { z } from "zod";

export const gamePlatform = z.preprocess(
  (value) => typeof value === "string" ? value.trim().toLowerCase() : value,
  z.enum(["ps4", "ps5", "ps5copy", "copy", "xbox"]),
).transform((value) => value === "ps5copy" ? "ps5Copy" : value);

export const gameItemId = z.string().regex(/^[a-f\d]{24}$/i);

export function isGameCoverUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const cloud = process.env.GAME_CLOUDINARY_CLOUD_NAME || "aeylqy7h";
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      !url.username && !url.password && !url.port &&
      url.pathname.startsWith(`/${cloud}/image/upload/`) &&
      url.pathname.length > `/${cloud}/image/upload/`.length && !url.search && !url.hash;
  } catch { return false; }
}

const optionalNumber = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.number().finite().nonnegative().nullable(),
);

export const gameInput = z.object({
  platform: gamePlatform,
  name: z.string().trim().min(1, "نام بازی را وارد کنید").max(250),
  size: optionalNumber,
  price: optionalNumber.refine((value) => value === null || Number.isSafeInteger(value), "قیمت باید عدد صحیح باشد"),
  storage: z.string().trim().max(100).nullable().optional().transform((value) => value || null),
  // Omitted image fields on older clients must preserve the current image on PUT.
  imageUrl: z.string().trim().max(2048).refine((value) => !value || isGameCoverUrl(value), "آدرس کاور باید متعلق به حساب Cloudinary بازی‌ها باشد").optional(),
  imageAlt: z.string().trim().max(300).optional(),
  imagePublicId: z.string().trim().max(300).optional(),
});
