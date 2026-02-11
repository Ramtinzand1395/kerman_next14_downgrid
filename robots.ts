import type { MetadataRoute } from "next";

const SITE_URL = "https://kermanatari.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/admin", "/api/auth","/my-profile","/cart","/api","/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
