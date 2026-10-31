import { Types } from "mongoose";

export const GAME_PLATFORMS = [
  "ps5",
  "ps5Copy",
  "ps4",
  "xbox",
  "copy",
] as const;

export type GamePlatform = (typeof GAME_PLATFORMS)[number];

const PLATFORM_ALIASES: Record<string, GamePlatform> = {
  ps5: "ps5",
  ps5copy: "ps5Copy",
  ps4: "ps4",
  xbox: "xbox",
  copy: "copy",
};

export const normalizeGamePlatform = (value: unknown): GamePlatform | null => {
  if (typeof value !== "string") return null;
  return PLATFORM_ALIASES[value.trim().toLowerCase()] || null;
};

const optionalNonNegativeNumber = (value: unknown, field: string) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} باید یک عدد نامنفی باشد.`);
  }
  return parsed;
};

const optionalText = (value: unknown, max: number, field: string) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} نامعتبر است.`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${field} بیش از حد طولانی است.`);
  return result || null;
};

export const parseGameInput = (body: Record<string, unknown>) => {
  const platform = normalizeGamePlatform(body.platform);
  if (!platform) throw new Error("پلتفرم معتبر نیست.");

  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new Error("نام بازی الزامی است.");
  }
  const name = body.name.trim();
  if (name.length > 160) throw new Error("نام بازی بیش از حد طولانی است.");

  return {
    platform,
    name,
    size: optionalNonNegativeNumber(body.size, "حجم"),
    price: optionalNonNegativeNumber(body.price, "قیمت"),
    storage: optionalText(body.storage, 80, "فضای ذخیره‌سازی"),
  };
};

export const parseGameItemId = (value: unknown) => {
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    throw new Error("شناسه بازی معتبر نیست.");
  }
  return value;
};
