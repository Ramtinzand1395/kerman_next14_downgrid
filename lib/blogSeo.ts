export type SeoCheckStatus = "pass" | "warning" | "fail";

export type SeoCheck = {
  id: string;
  title: string;
  message: string;
  status: SeoCheckStatus;
  points: number;
};

export type BlogSeoInput = {
  title?: string;
  seoTitle?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  metaDescription?: string;
  focusKeyword?: string[] | string;
  coverImage?: string;
  coverImageAlt?: string;
};

export type BlogSeoAnalysis = {
  score: number;
  readyToPublish: boolean;
  checks: SeoCheck[];
  stats: {
    wordCount: number;
    readingTime: number;
    titleLength: number;
    metaLength: number;
    excerptLength: number;
    keywordDensity: number;
    headingCount: number;
    internalLinks: number;
    externalLinks: number;
  };
};

const decodeBasicEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

export const stripBlogHtml = (value = "") =>
  decodeBasicEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeBlogContent = (value = "") =>
  value
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
      ' $1="#"',
    )
    .trim();

const normalizeText = (value = "") =>
  stripBlogHtml(value)
    .toLocaleLowerCase("fa")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeBlogSlug = (value: string) =>
  value
    .toLocaleLowerCase("fa")
    .trim()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const parseBlogKeywords = (value: string[] | string | undefined) => {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))].slice(
    0,
    10,
  );
};

const countOccurrences = (haystack: string, needle: string) => {
  if (!needle) return 0;
  let count = 0;
  let position = 0;
  while ((position = haystack.indexOf(needle, position)) !== -1) {
    count += 1;
    position += needle.length;
  }
  return count;
};

const addCheck = (
  checks: SeoCheck[],
  check: Omit<SeoCheck, "status"> & { pass: boolean; warning?: boolean },
) => {
  checks.push({
    id: check.id,
    title: check.title,
    message: check.message,
    points: check.points,
    status: check.pass ? "pass" : check.warning ? "warning" : "fail",
  });
};

export function analyzeBlogSeo(input: BlogSeoInput): BlogSeoAnalysis {
  const title = stripBlogHtml(input.title);
  const seoTitle = stripBlogHtml(input.seoTitle) || title;
  const slug = normalizeBlogSlug(input.slug || title);
  const excerpt = stripBlogHtml(input.excerpt);
  const metaDescription = stripBlogHtml(input.metaDescription);
  const contentText = stripBlogHtml(input.content);
  const keywords = parseBlogKeywords(input.focusKeyword);
  const primaryKeyword = normalizeText(keywords[0]);
  const normalizedTitle = normalizeText(seoTitle);
  const normalizedMeta = normalizeText(metaDescription);
  const normalizedContent = normalizeText(contentText);
  const normalizedSlug = normalizeBlogSlug(slug).replace(/-/g, " ");
  const normalizedKeywordForSlug = normalizeBlogSlug(primaryKeyword).replace(/-/g, " ");
  const words = contentText.match(/[\p{L}\p{N}]+/gu) || [];
  const wordCount = words.length;
  const firstParagraph = stripBlogHtml(
    input.content?.match(/<p\b[^>]*>[\s\S]*?<\/p>/i)?.[0] ||
      contentText.slice(0, 350),
  );
  const h1Count = (input.content?.match(/<h1\b/gi) || []).length;
  const h2Count = (input.content?.match(/<h2\b/gi) || []).length;
  const h3Count = (input.content?.match(/<h3\b/gi) || []).length;
  const links = [...(input.content?.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi) || [])]
    .map((match) => match[1])
    .filter(Boolean);
  const internalLinks = links.filter(
    (href) => href.startsWith("/") || href.includes("kermanatari"),
  ).length;
  const externalLinks = links.filter(
    (href) => /^https?:\/\//i.test(href) && !href.includes("kermanatari"),
  ).length;
  const images = [...(input.content?.matchAll(/<img\b([^>]*)>/gi) || [])];
  const imagesWithoutAlt = images.filter((match) => {
    const alt = match[1].match(/\balt=["']([^"']*)["']/i)?.[1]?.trim();
    return !alt;
  }).length;
  const keywordOccurrences = countOccurrences(normalizedContent, primaryKeyword);
  const keywordWordCount = Math.max(primaryKeyword.split(/\s+/).filter(Boolean).length, 1);
  const keywordDensity =
    wordCount && primaryKeyword
      ? Number(((keywordOccurrences * keywordWordCount * 100) / wordCount).toFixed(1))
      : 0;
  const checks: SeoCheck[] = [];

  addCheck(checks, {
    id: "keyword",
    title: "کلمه کلیدی اصلی",
    message: primaryKeyword
      ? `کلمه کلیدی اصلی «${keywords[0]}» مشخص شده است.`
      : "حداقل یک کلمه کلیدی وارد کنید؛ اولین مورد، کلمه کلیدی اصلی است.",
    pass: Boolean(primaryKeyword),
    points: 10,
  });
  addCheck(checks, {
    id: "seo-title-length",
    title: "طول عنوان سئو",
    message:
      seoTitle.length >= 30 && seoTitle.length <= 60
        ? `عنوان سئو ${seoTitle.length} کاراکتر است.`
        : `عنوان سئو ${seoTitle.length} کاراکتر است؛ بازه پیشنهادی ۳۰ تا ۶۰ است.`,
    pass: seoTitle.length >= 30 && seoTitle.length <= 60,
    points: 8,
  });
  addCheck(checks, {
    id: "keyword-in-title",
    title: "کلمه کلیدی در عنوان",
    message:
      primaryKeyword && normalizedTitle.includes(primaryKeyword)
        ? "عنوان سئو شامل کلمه کلیدی اصلی است."
        : "کلمه کلیدی اصلی را به‌صورت طبیعی در عنوان سئو بیاورید.",
    pass: Boolean(primaryKeyword && normalizedTitle.includes(primaryKeyword)),
    points: 9,
  });
  addCheck(checks, {
    id: "slug",
    title: "نشانی مقاله",
    message:
      slug.length >= 3 && slug.length <= 75
        ? `نشانی خوانا و ${slug.length} کاراکتر است.`
        : "نشانی باید خوانا، بدون نویسه اضافی و حداکثر ۷۵ کاراکتر باشد.",
    pass: slug.length >= 3 && slug.length <= 75,
    points: 5,
  });
  addCheck(checks, {
    id: "keyword-in-slug",
    title: "کلمه کلیدی در نشانی",
    message:
      primaryKeyword && normalizedSlug.includes(normalizedKeywordForSlug)
        ? "نشانی شامل کلمه کلیدی اصلی است."
        : "نشانی کوتاه را بر پایه کلمه کلیدی اصلی بسازید.",
    pass: Boolean(
      primaryKeyword && normalizedKeywordForSlug && normalizedSlug.includes(normalizedKeywordForSlug),
    ),
    points: 5,
  });
  addCheck(checks, {
    id: "meta-length",
    title: "توضیحات متا",
    message:
      metaDescription.length >= 120 && metaDescription.length <= 165
        ? `توضیحات متا ${metaDescription.length} کاراکتر است.`
        : `توضیحات متا ${metaDescription.length} کاراکتر است؛ بازه مناسب ۱۲۰ تا ۱۶۵ است.`,
    pass: metaDescription.length >= 120 && metaDescription.length <= 165,
    points: 9,
  });
  addCheck(checks, {
    id: "keyword-in-meta",
    title: "کلمه کلیدی در متا",
    message:
      primaryKeyword && normalizedMeta.includes(primaryKeyword)
        ? "توضیحات متا شامل کلمه کلیدی اصلی است."
        : "کلمه کلیدی اصلی را یک‌بار و طبیعی در توضیحات متا استفاده کنید.",
    pass: Boolean(primaryKeyword && normalizedMeta.includes(primaryKeyword)),
    points: 7,
  });
  addCheck(checks, {
    id: "excerpt",
    title: "خلاصه مقاله",
    message:
      excerpt.length >= 80 && excerpt.length <= 220
        ? `خلاصه ${excerpt.length} کاراکتر و مناسب کارت مقاله است.`
        : `خلاصه ${excerpt.length} کاراکتر است؛ بازه مناسب ۸۰ تا ۲۲۰ است.`,
    pass: excerpt.length >= 80 && excerpt.length <= 220,
    points: 5,
  });
  addCheck(checks, {
    id: "word-count",
    title: "عمق محتوا",
    message:
      wordCount >= 600
        ? `مقاله ${wordCount.toLocaleString("fa-IR")} کلمه دارد.`
        : `مقاله ${wordCount.toLocaleString("fa-IR")} کلمه دارد؛ برای یک مقاله کامل حداقل ۶۰۰ کلمه بنویسید.`,
    pass: wordCount >= 600,
    points: 10,
  });
  addCheck(checks, {
    id: "keyword-in-intro",
    title: "کلمه کلیدی در مقدمه",
    message:
      primaryKeyword && normalizeText(firstParagraph).includes(primaryKeyword)
        ? "کلمه کلیدی در پاراگراف ابتدایی دیده می‌شود."
        : "کلمه کلیدی اصلی را در پاراگراف ابتدایی مقاله بیاورید.",
    pass: Boolean(primaryKeyword && normalizeText(firstParagraph).includes(primaryKeyword)),
    points: 6,
  });
  addCheck(checks, {
    id: "headings",
    title: "ساختار تیترها",
    message:
      h1Count === 0 && h2Count >= 2
        ? `ساختار شامل ${h2Count.toLocaleString("fa-IR")} تیتر H2 و ${h3Count.toLocaleString("fa-IR")} تیتر H3 است.`
        : h1Count > 0
          ? "داخل متن H1 نگذارید؛ عنوان صفحه H1 است و بخش‌ها باید با H2 شروع شوند."
          : "برای بخش‌بندی مقاله حداقل دو تیتر H2 اضافه کنید.",
    pass: h1Count === 0 && h2Count >= 2,
    points: 7,
  });
  addCheck(checks, {
    id: "cover",
    title: "تصویر شاخص",
    message: input.coverImage
      ? "تصویر شاخص مقاله انتخاب شده است."
      : "یک تصویر شاخص مرتبط و باکیفیت انتخاب کنید.",
    pass: Boolean(input.coverImage),
    points: 5,
  });
  addCheck(checks, {
    id: "cover-alt",
    title: "متن جایگزین تصویر",
    message:
      stripBlogHtml(input.coverImageAlt).length >= 5 &&
      stripBlogHtml(input.coverImageAlt).length <= 125
        ? "متن جایگزین تصویر شاخص مناسب است."
        : "برای تصویر شاخص یک متن جایگزین توصیفی بین ۵ تا ۱۲۵ کاراکتر بنویسید.",
    pass:
      stripBlogHtml(input.coverImageAlt).length >= 5 &&
      stripBlogHtml(input.coverImageAlt).length <= 125,
    points: 5,
  });
  addCheck(checks, {
    id: "keyword-density",
    title: "تراکم کلمه کلیدی",
    message: primaryKeyword
      ? `تراکم تقریبی کلمه کلیدی ${keywordDensity.toLocaleString("fa-IR")}٪ است؛ بازه طبیعی ۰٫۵ تا ۲٫۵٪ است.`
      : "پس از تعیین کلمه کلیدی، تراکم آن محاسبه می‌شود.",
    pass: keywordDensity >= 0.5 && keywordDensity <= 2.5,
    warning: true,
    points: 5,
  });
  addCheck(checks, {
    id: "internal-link",
    title: "لینک داخلی",
    message: internalLinks
      ? `${internalLinks.toLocaleString("fa-IR")} لینک داخلی در مقاله وجود دارد.`
      : "برای پیوند موضوعی و هدایت کاربر، حداقل یک لینک داخلی اضافه کنید.",
    pass: internalLinks > 0,
    warning: true,
    points: 4,
  });
  addCheck(checks, {
    id: "external-link",
    title: "منبع معتبر",
    message: externalLinks
      ? `${externalLinks.toLocaleString("fa-IR")} لینک خارجی در مقاله وجود دارد.`
      : "در صورت نیاز، به یک منبع معتبر و مرتبط لینک بدهید.",
    pass: externalLinks > 0,
    warning: true,
    points: 3,
  });
  addCheck(checks, {
    id: "image-alt",
    title: "متن جایگزین تصاویر متن",
    message:
      imagesWithoutAlt === 0
        ? images.length
          ? "همه تصاویر داخل متن متن جایگزین دارند."
          : "تصویری داخل متن استفاده نشده است."
        : `${imagesWithoutAlt.toLocaleString("fa-IR")} تصویر داخل متن، متن جایگزین ندارد.`,
    pass: imagesWithoutAlt === 0,
    warning: true,
    points: 2,
  });

  const totalPoints = checks.reduce((sum, check) => sum + check.points, 0);
  const earnedPoints = checks.reduce(
    (sum, check) => sum + (check.status === "pass" ? check.points : 0),
    0,
  );

  return {
    score: Math.round((earnedPoints / totalPoints) * 100),
    readyToPublish: !checks.some((check) => check.status === "fail"),
    checks,
    stats: {
      wordCount,
      readingTime: Math.max(1, Math.ceil(wordCount / 220)),
      titleLength: seoTitle.length,
      metaLength: metaDescription.length,
      excerptLength: excerpt.length,
      keywordDensity,
      headingCount: h2Count + h3Count,
      internalLinks,
      externalLinks,
    },
  };
}

export const getBlockingSeoMessages = (input: BlogSeoInput) =>
  analyzeBlogSeo(input).checks
    .filter((check) => check.status === "fail")
    .map((check) => check.message);
