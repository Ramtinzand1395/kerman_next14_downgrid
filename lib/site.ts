const DEFAULT_SITE_URL = "https://kermanatari.ir";

const vercelDeploymentUrl = process.env.VERCEL_URL?.trim();

const configuredSiteUrl =
  process.env.SITE_URL?.trim() ||
  (process.env.VERCEL_ENV === "preview" ? vercelDeploymentUrl : undefined) ||
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  vercelDeploymentUrl ||
  DEFAULT_SITE_URL;

const siteUrlWithProtocol = /^https?:\/\//i.test(configuredSiteUrl)
  ? configuredSiteUrl
  : `https://${configuredSiteUrl}`;

export const SITE_URL = new URL(siteUrlWithProtocol).origin;

export const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
