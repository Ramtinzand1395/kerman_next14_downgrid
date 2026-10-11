import {
  getBlockingSeoMessages,
  normalizeBlogSlug,
  parseBlogKeywords,
  sanitizeBlogContent,
  stripBlogHtml,
} from "@/lib/blogSeo";

export type BlogPayload = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt: string;
  published: boolean;
  publishedAt: Date | null;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string[];
  category: string;
  tags: string[];
};

const text = (value: unknown, maxLength: number) =>
  stripBlogHtml(String(value || "")).slice(0, maxLength);

const parseList = (value: unknown, limit: number) => {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(items.map((item) => text(item, 60)).filter(Boolean))].slice(0, limit);
};

export function buildBlogPayload(
  body: Record<string, unknown>,
  previousPublishedAt?: Date | string | null,
) {
  const title = text(body.title, 180);
  const published = body.published === true;
  const payload: BlogPayload = {
    title,
    slug: normalizeBlogSlug(String(body.slug || title)).slice(0, 100),
    excerpt: text(body.excerpt, 320),
    content: sanitizeBlogContent(String(body.content || "")),
    coverImage: String(body.coverImage || "").trim().slice(0, 2000),
    coverImageAlt: text(body.coverImageAlt, 160),
    published,
    publishedAt: published
      ? previousPublishedAt
        ? new Date(previousPublishedAt)
        : new Date()
      : previousPublishedAt
        ? new Date(previousPublishedAt)
        : null,
    seoTitle: text(body.seoTitle, 100),
    metaDescription: text(body.metaDescription, 220),
    focusKeyword: parseBlogKeywords(
      Array.isArray(body.focusKeyword)
        ? body.focusKeyword.map(String)
        : String(body.focusKeyword || ""),
    ),
    category: text(body.category, 60),
    tags: parseList(body.tags, 15),
  };

  if (!payload.title) {
    return { error: "عنوان مقاله الزامی است", payload, seoIssues: [] as string[] };
  }

  if (!payload.slug) {
    return { error: "نشانی مقاله نامعتبر است", payload, seoIssues: [] as string[] };
  }

  const seoIssues = published ? getBlockingSeoMessages(payload) : [];
  if (published && seoIssues.length) {
    return {
      error: "مقاله هنوز شرایط انتشار را ندارد",
      payload,
      seoIssues,
    };
  }

  return { error: null, payload, seoIssues };
}
