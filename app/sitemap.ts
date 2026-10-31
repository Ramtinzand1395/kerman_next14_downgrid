import type { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import Blog from "@/model/Blog";
import { getCategoryCatalog } from "@/lib/catalog/category-data";
import { categoryHref } from "@/lib/catalog/category-seo";

import { SITE_URL } from "@/lib/site";
// Read current publication state on every request, including unpublishes/deletes.
export const dynamic = "force-dynamic";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${SITE_URL}/products`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/blog`,
    changeFrequency: "daily",
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/about-us`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/services`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/guides/ps5-buying-guide`,
    lastModified: new Date("2026-10-05"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/guides/ps4-buying-guide`,
    lastModified: new Date("2026-10-05"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/guides/xbox-buying-guide`,
    lastModified: new Date("2026-10-07"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/contact-us`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/terms`,
    lastModified: new Date("2026-10-02"),
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

type ProductSitemapRow = {
  slug: string;
  updatedAt?: string | Date;
};

type BlogSitemapRow = {
  slug?: unknown;
  updatedAt?: string | Date;
  publishedAt?: string | Date;
  createdAt?: string | Date;
};

function blogPath(slug: unknown): string | null {
  if (typeof slug !== "string" || !slug.trim()) return null;
  let decoded = slug.trim();
  // Match the existing blog lookup's support for encoded legacy slugs.
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  if (
    decoded === "." ||
    decoded === ".." ||
    /[\/\\\u0000-\u001f]/.test(decoded)
  )
    return null;
  return `/blog/${encodeURIComponent(decoded)}`;
}

function blogLastModified(blog: BlogSitemapRow): Date | undefined {
  for (const value of [blog.updatedAt, blog.publishedAt, blog.createdAt]) {
    if (!value) continue;
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Let transient DB failures return an error instead of a successful but
  // incomplete sitemap that silently drops all product and article URLs.
  await dbConnect();
  const [products, blogs, categories] = await Promise.all([
    Product.find(
      { status: "published", deletedAt: null },
      { slug: 1, updatedAt: 1, _id: 0 },
    )
      .lean()
      .exec() as Promise<ProductSitemapRow[]>,
    Blog.find(
      { published: true, deletedAt: null },
      { slug: 1, updatedAt: 1, publishedAt: 1, createdAt: 1, _id: 0 },
    )
      .lean()
      .exec() as Promise<BlogSitemapRow[]>,
    getCategoryCatalog(),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products
    .filter(
      (product) => typeof product.slug === "string" && product.slug.length > 0,
    )
    .map((product) => ({
      url: `${SITE_URL}/product/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const blogRoutes = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const blog of blogs) {
    const path = blogPath(blog.slug);
    if (!path) continue;
    const url = `${SITE_URL}${path}`;
    const lastModified = blogLastModified(blog);
    const previous = blogRoutes.get(url);
    if (
      !previous ||
      (lastModified &&
        (!previous.lastModified ||
          lastModified > new Date(previous.lastModified)))
    ) {
      blogRoutes.set(url, {
        url,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((category) => category.productCount > 0)
    .map((category) => ({
      url: `${SITE_URL}${categoryHref(category.slug)}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  return [
    ...staticRoutes,
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    ...categoryRoutes,
    ...productRoutes,
    ...blogRoutes.values(),
  ];
}
