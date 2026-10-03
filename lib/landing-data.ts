import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import Category from "@/model/Category";
import ProductModel from "@/model/Product";
import Tag from "@/model/Tag";
import "@/model/Comment";
import type { BlogPost, Product } from "@/types";

const LANDING_CATEGORY_SLUGS = [
  "games",
  "consoles",
  "accessories",
  "gaming-accessories",
] as const;

const GENRE_SLUGS = [
  "sports",
  "action",
  "adventure",
  "family",
  "racing",
  "horror",
] as const;

type CategoryRecord = {
  _id: { toString(): string };
  slug: string;
  parent?: { toString(): string } | null;
};

export type LandingGenre = {
  name: string;
  slug: string;
  count: number;
};

export type LandingData = {
  latestGames: Product[];
  equipment: Product[];
  consoles: Product[];
  genres: LandingGenre[];
  articles: BlogPost[];
};

function serializeProduct(document: any): Product {
  return {
    _id: document._id.toString(),
    sku: document.sku || document._id.toString(),
    title: document.title,
    slug: document.slug,
    description: document.description || "",
    shortDesc: document.shortDesc || "",
    price: Number(document.price || 0),
    discountPrice:
      typeof document.discountPrice === "number"
        ? document.discountPrice
        : null,
    stock: Number(document.stock || 0),
    brand: document.brand || "",
    mainImage: document.mainImage || "",
    mainImageAlt: document.mainImageAlt || document.title,
    productType: document.productType || "single",
    variants: (document.variants || []).map((variant: any) => ({
      _id: variant._id?.toString(),
      title: variant.title,
      sku: variant.sku,
      price: Number(variant.price || 0),
      discountPrice:
        typeof variant.discountPrice === "number"
          ? variant.discountPrice
          : null,
      stock: Number(variant.stock || 0),
    })),
    createdAt: document.createdAt
      ? new Date(document.createdAt).toISOString()
      : "",
    updatedAt: document.updatedAt
      ? new Date(document.updatedAt).toISOString()
      : "",
    tags: (document.tags || []).map((tag: any) => ({
      _id: tag._id?.toString() || "",
      name: tag.name || "",
      slug: tag.slug || "",
    })),
    comments: (document.comments || []).map((comment: any) => ({
      _id: comment._id?.toString() || "",
      text: "",
      rating: Number(comment.rating || 0),
      userId: 0,
      verified: true,
      createdAt: comment.createdAt
        ? new Date(comment.createdAt).toISOString()
        : "",
    })),
    images: [],
    specifications: [],
    favorites: [],
    OrderItem: [],
    categoryId: 0,
    category: {
      _id: document.category?._id?.toString() || "",
      name: document.category?.name || "",
      slug: document.category?.slug || "",
      createdAt: "",
      updatedAt: "",
    },
    seoTitle: document.seoTitle || "",
    metaDescription: document.metaDescription || "",
  };
}

function serializeArticle(document: any): BlogPost {
  return {
    _id: document._id.toString(),
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt || "",
    content: document.content || "",
    coverImage: document.coverImage || "",
    published: Boolean(document.published),
    createdAt: document.createdAt
      ? new Date(document.createdAt).toISOString()
      : "",
    updatedAt: document.updatedAt
      ? new Date(document.updatedAt).toISOString()
      : "",
    metaDescription: document.metaDescription || "",
    focusKeyword: document.focusKeyword || [],
  };
}

export async function getLandingData(): Promise<LandingData> {
  const empty: LandingData = {
    latestGames: [],
    equipment: [],
    consoles: [],
    genres: [],
    articles: [],
  };

  try {
    await dbConnect();

    const parents = (await Category.find({
      slug: { $in: LANDING_CATEGORY_SLUGS },
    })
      .select("_id slug parent")
      .lean()) as CategoryRecord[];

    const children = parents.length
      ? ((await Category.find({
          parent: { $in: parents.map((category) => category._id) },
        })
          .select("_id slug parent")
          .lean()) as CategoryRecord[])
      : [];

    const idsFor = (slug: string) => {
      const parent = parents.find((category) => category.slug === slug);
      if (!parent) return [];
      const parentId = parent._id.toString();
      return [
        parent._id,
        ...children
          .filter((category) => category.parent?.toString() === parentId)
          .map((category) => category._id),
      ];
    };

    const gameCategoryIds = idsFor("games");
    const consoleCategoryIds = idsFor("consoles");
    const equipmentCategoryIds = [
      ...idsFor("accessories"),
      ...idsFor("gaming-accessories"),
    ];

    const productFields =
      "sku title slug description shortDesc price discountPrice stock brand mainImage mainImageAlt productType variants category tags comments createdAt updatedAt seoTitle metaDescription";

    const productQuery = (categoryIds: any[], limit: number) =>
      categoryIds.length
        ? ProductModel.find({
            status: "published",
            category: { $in: categoryIds },
          })
            .select(productFields)
            .populate("category", "name slug")
            .populate("tags", "name slug")
            .populate({
              path: "comments",
              match: { verified: true },
              select: "rating createdAt",
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
        : Promise.resolve([]);

    const [latestGamesRaw, equipmentRaw, consolesRaw, articlesRaw, genreTags] =
      await Promise.all([
        productQuery(gameCategoryIds, 8),
        productQuery(equipmentCategoryIds, 8),
        productQuery(consoleCategoryIds, 4),
        Blog.find({ published: true })
          .select(
            "title slug excerpt content coverImage published createdAt updatedAt metaDescription focusKeyword",
          )
          .sort({ createdAt: -1 })
          .limit(3)
          .lean(),
        Tag.find({ slug: { $in: GENRE_SLUGS } })
          .select("_id name slug")
          .lean(),
      ]);

    const genreCounts = gameCategoryIds.length
      ? await Promise.all(
          genreTags.map(async (tag: any) => ({
            name: tag.name,
            slug: tag.slug,
            count: await ProductModel.countDocuments({
              status: "published",
              category: { $in: gameCategoryIds },
              tags: tag._id,
            }),
          })),
        )
      : [];

    return {
      latestGames: latestGamesRaw.map(serializeProduct),
      equipment: equipmentRaw.map(serializeProduct),
      consoles: consolesRaw.map(serializeProduct),
      genres: genreCounts.filter((genre) => genre.count > 0),
      articles: articlesRaw.map(serializeArticle),
    };
  } catch (error) {
    console.error("Landing data error:", error);
    return empty;
  }
}
