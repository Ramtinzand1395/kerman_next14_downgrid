import type { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";

import { SITE_URL } from "@/lib/site";
const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${SITE_URL}/products`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/about-us`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/services`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/contact-us`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

type ProductSitemapRow = {
  slug: string;
  updatedAt?: string | Date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await dbConnect();

    // const products = (await Product.find({}, { slug: 1, updatedAt: 1, _id: 0 })
    const products = (await Product.find(
      { status: "published" },
      { slug: 1, updatedAt: 1, _id: 0 },
    )
      .lean()
      .exec()) as ProductSitemapRow[];

    const productRoutes: MetadataRoute.Sitemap = products
      .filter(
        (product) =>
          typeof product.slug === "string" && product.slug.length > 0,
      )
      .map((product) => ({
        url: `${SITE_URL}/product/${product.slug}`,
        lastModified: product.updatedAt
          ? new Date(product.updatedAt)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
