import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import Category from "@/model/Category";
import ProductModel from "@/model/Product";
import Tag from "@/model/Tag";
import "@/model/Comment";
import type { BlogPost, Product } from "@/types";

type CategoryRecord = {
  _id: { toString(): string };
  name: string;
  slug: string;
  parent?: { toString(): string } | null;
};

type TagRecord = {
  _id: { toString(): string };
  name: string;
  slug: string;
};

export type LandingGenre = {
  name: string;
  slug: string;
  count: number;
};

export type LandingProductTab = {
  id: string;
  label: string;
  href: string;
  products: Product[];
};

export type LandingData = {
  gameTabs: LandingProductTab[];
  equipmentTabs: LandingProductTab[];
  consoles: Product[];
  genres: LandingGenre[];
  articles: BlogPost[];
};

const PRODUCT_FIELDS =
  "sku title slug description shortDesc price discountPrice stock brand mainImage mainImageAlt productType variants category tags comments createdAt updatedAt seoTitle metaDescription";

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

function descendantsFor(categories: CategoryRecord[], rootSlug: string) {
  const root = categories.find((category) => category.slug === rootSlug);
  if (!root) return [];

  const ids = [root._id];
  const pending = [root._id.toString()];

  while (pending.length) {
    const parentId = pending.shift();
    const children = categories.filter(
      (category) => category.parent?.toString() === parentId,
    );
    children.forEach((child) => {
      if (!ids.some((id) => id.toString() === child._id.toString())) {
        ids.push(child._id);
        pending.push(child._id.toString());
      }
    });
  }

  return ids;
}

export async function getLandingData(): Promise<LandingData> {
  const empty: LandingData = {
    gameTabs: [
      { id: "ps5", label: "PS5", href: "/products?category=games&tag=ps5&sort=newest&page=1", products: [] },
      { id: "featured", label: "ویژه", href: "/products?category=games&sort=newest&page=1", products: [] },
      { id: "ps4", label: "PS4", href: "/products?category=games&tag=ps4&sort=newest&page=1", products: [] },
      { id: "latest", label: "جدیدترین", href: "/products?category=games&sort=newest&page=1", products: [] },
    ],
    equipmentTabs: [
      { id: "controllers", label: "دسته بازی", href: "/products?category=controllers&sort=newest&page=1", products: [] },
      { id: "chargers", label: "شارژر", href: "/products?category=accessories&tag=controller-charger&sort=newest&page=1", products: [] },
      { id: "stands", label: "پایه", href: "/products?category=stands-coolers&sort=newest&page=1", products: [] },
      { id: "cables", label: "کابل", href: "/products?category=accessories&tag=cable&sort=newest&page=1", products: [] },
      { id: "ps5-accessories", label: "لوازم PS5", href: "/products?category=accessories&tag=ps5&sort=newest&page=1", products: [] },
    ],
    consoles: [],
    genres: [],
    articles: [],
  };

  try {
    await dbConnect();

    const [categories, tags] = await Promise.all([
      Category.find({}).select("_id name slug parent").lean<CategoryRecord[]>(),
      Tag.find({}).select("_id name slug").lean<TagRecord[]>(),
    ]);

    const gameCategoryIds = descendantsFor(categories, "games");
    const consoleCategoryIds = descendantsFor(categories, "consoles");
    const equipmentCategoryIds = [
      ...descendantsFor(categories, "accessories"),
      ...descendantsFor(categories, "gaming-accessories"),
    ];

    const categoryIdsFor = (slug: string) => descendantsFor(categories, slug);
    const tagIdsFor = (slugs: string[]) =>
      tags.filter((tag) => slugs.includes(tag.slug)).map((tag) => tag._id);

    const productQuery = (
      categoryIds: any[],
      limit: number,
      extraFilter: Record<string, unknown> = {},
    ) =>
      categoryIds.length
        ? ProductModel.find({
            status: "published",
            category: { $in: categoryIds },
            ...extraFilter,
          })
            .select(PRODUCT_FIELDS)
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

    const taggedQuery = (
      categoryIds: any[],
      slugs: string[],
      limit: number,
    ) => {
      const tagIds = tagIdsFor(slugs);
      return tagIds.length
        ? productQuery(categoryIds, limit, { tags: { $in: tagIds } })
        : Promise.resolve([]);
    };

    const [
      ps5GamesRaw,
      featuredGamesRaw,
      ps4GamesRaw,
      latestGamesRaw,
      controllersRaw,
      chargersRaw,
      standsRaw,
      cablesRaw,
      ps5AccessoriesRaw,
      consolesRaw,
      articlesRaw,
    ] = await Promise.all([
      taggedQuery(gameCategoryIds, ["ps5", "ps5-game"], 6),
      productQuery(gameCategoryIds, 6, {
        $expr: {
          $and: [
            { $ne: ["$discountPrice", null] },
            { $lt: ["$discountPrice", "$price"] },
          ],
        },
      }),
      taggedQuery(gameCategoryIds, ["ps4", "ps4-game"], 6),
      productQuery(gameCategoryIds, 6),
      productQuery(categoryIdsFor("controllers"), 4),
      taggedQuery(
        equipmentCategoryIds,
        ["controller-charger", "charging-dock", "controller-charging"],
        4,
      ),
      productQuery(categoryIdsFor("stands-coolers"), 4),
      taggedQuery(
        equipmentCategoryIds,
        ["cable", "hdmi-cable", "charging-cable", "power-cable"],
        4,
      ),
      taggedQuery(
        equipmentCategoryIds,
        ["ps5", "dualsense", "ps5-controller"],
        4,
      ),
      productQuery(consoleCategoryIds, 4),
      Blog.find({ published: true })
        .select(
          "title slug excerpt content coverImage published createdAt updatedAt metaDescription focusKeyword",
        )
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const genreSlugs = [
      "sports",
      "action",
      "adventure",
      "two-player",
      "racing",
      "rpg",
    ];
    const genreTags = tags.filter((tag) => genreSlugs.includes(tag.slug));
    const genreCounts = await Promise.all(
      genreTags.map(async (tag) => ({
        name: tag.name,
        slug: tag.slug,
        count: gameCategoryIds.length
          ? await ProductModel.countDocuments({
              status: "published",
              category: { $in: gameCategoryIds },
              tags: tag._id,
            })
          : 0,
      })),
    );

    const withProducts = (
      tabs: LandingProductTab[],
      products: any[][],
    ): LandingProductTab[] =>
      tabs.map((tab, index) => ({
        ...tab,
        products: (products[index] || []).map(serializeProduct),
      }));

    return {
      gameTabs: withProducts(empty.gameTabs, [
        ps5GamesRaw,
        featuredGamesRaw,
        ps4GamesRaw,
        latestGamesRaw,
      ]),
      equipmentTabs: withProducts(empty.equipmentTabs, [
        controllersRaw,
        chargersRaw,
        standsRaw,
        cablesRaw,
        ps5AccessoriesRaw,
      ]),
      consoles: consolesRaw.map(serializeProduct),
      genres: genreCounts,
      articles: articlesRaw.map(serializeArticle),
    };
  } catch (error) {
    console.error("Landing data error:", error);
    return empty;
  }
}
