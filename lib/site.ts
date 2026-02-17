const DEFAULT_SITE_URL = "https://kermanatari.ir";

export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_SITE_URL)
  .trim()
  .replace(/\/$/, "");

export const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
