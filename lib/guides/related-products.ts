import dbConnect from "@/lib/mongodb";
import Category from "@/model/Category";
import Product from "@/model/Product";
import Tag from "@/model/Tag";

export type GuideProduct = {
  id: string;
  title: string;
  slug: string;
  image: string;
  imageAlt: string;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
};

export type GuideProductsResult =
  | { status: "success"; products: GuideProduct[] }
  | { status: "error"; products: [] };

type CategoryRecord = {
  _id: { toString(): string };
  slug: string;
  parent?: { toString(): string } | null;
};

function descendantIds(categories: CategoryRecord[], rootSlug: string) {
  const root = categories.find((category) => category.slug === rootSlug);
  if (!root) return [];

  const result = [root._id];
  const pending = [root._id.toString()];

  while (pending.length > 0) {
    const parentId = pending.shift();
    const children = categories.filter(
      (category) => category.parent?.toString() === parentId,
    );

    for (const child of children) {
      if (!result.some((id) => id.toString() === child._id.toString())) {
        result.push(child._id);
        pending.push(child._id.toString());
      }
    }
  }

  return result;
}

function toGuideProduct(document: any): GuideProduct {
  const variants = Array.isArray(document.variants) ? document.variants : [];
  const availableVariants = variants.filter(
    (variant: any) => Number(variant.stock || 0) > 0,
  );
  const availablePrices: Array<{ price: number; finalPrice: number }> =
    availableVariants.map((variant: any) => ({
    price: Number(variant.price || 0),
    finalPrice:
      typeof variant.discountPrice === "number" &&
      variant.discountPrice < variant.price
        ? Number(variant.discountPrice)
        : Number(variant.price || 0),
    }));
  const lowestVariant = availablePrices.sort(
    (first, second) => first.finalPrice - second.finalPrice,
  )[0];
  const isMulti = document.productType === "multi" && variants.length > 0;
  const basePrice = Number(document.price || 0);
  const hasBaseDiscount =
    typeof document.discountPrice === "number" &&
    document.discountPrice < basePrice;
  const price = isMulti
    ? Number(lowestVariant?.finalPrice || basePrice)
    : hasBaseDiscount
      ? Number(document.discountPrice)
      : basePrice;
  const originalPrice = isMulti
    ? lowestVariant && lowestVariant.price > lowestVariant.finalPrice
      ? lowestVariant.price
      : null
    : hasBaseDiscount
      ? basePrice
      : null;

  return {
    id: document._id.toString(),
    title: String(document.title || ""),
    slug: String(document.slug || ""),
    image: String(document.mainImage || ""),
    imageAlt: String(document.mainImageAlt || document.title || "تصویر محصول"),
    price,
    originalPrice,
    inStock: isMulti
      ? availableVariants.length > 0
      : Number(document.stock || 0) > 0,
  };
}

export async function getPs5GuideProducts(): Promise<GuideProductsResult> {
  try {
    await dbConnect();

    const [categories, ps5Tags] = await Promise.all([
      Category.find({}).select("_id slug parent").lean<CategoryRecord[]>(),
      Tag.find({
        slug: { $in: ["ps5", "playstation-5", "ps5-console"] },
      })
        .select("_id")
        .lean(),
    ]);
    const consoleCategoryIds = descendantIds(categories, "consoles");
    const tagIds = ps5Tags.map((tag: any) => tag._id);
    const ps5Signals: Record<string, unknown>[] = [
      { title: /(^|\s)(ps5|playstation\s*5)(\s|$)/i },
      { slug: /(^|[-_])(ps5|playstation-5)([-_]|$)/i },
    ];

    if (tagIds.length > 0) {
      ps5Signals.unshift({ tags: { $in: tagIds } });
    }

    const filter: Record<string, unknown> = {
      status: "published",
      $or: ps5Signals,
    };

    if (consoleCategoryIds.length > 0) {
      filter.category = { $in: consoleCategoryIds };
    }

    const products = await Product.find(filter)
      .select(
        "title slug mainImage mainImageAlt price discountPrice stock productType variants createdAt",
      )
      .sort({ stock: -1, createdAt: -1 })
      .limit(4)
      .lean();

    return {
      status: "success",
      products: products.map(toGuideProduct),
    };
  } catch (error) {
    console.error("PS5 guide products error:", error);
    return { status: "error", products: [] };
  }
}
