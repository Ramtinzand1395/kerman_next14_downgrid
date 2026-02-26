const DEFAULT_SITE_URL = "https://kermanatari.ir";

export function getSiteUrl() {
  const configured =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!configured) {
    return DEFAULT_SITE_URL;
  }

  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
