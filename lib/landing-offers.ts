import { isVariantMappedForSale } from "./variantSelector";
import type { VariantSelectorConfig } from "@/types";

type OfferPrice = {
  price: number;
  discountPrice?: number | null;
  stock?: number;
};

type OfferVariant = OfferPrice & {
  _id: { toString(): string };
  title: string;
  isActive?: boolean;
};

export type LandingOfferProduct = OfferPrice & {
  title: string;
  slug: string;
  mainImage: string;
  mainImageAlt?: string;
  productType?: string;
  variants?: OfferVariant[];
  variantSelector?: VariantSelectorConfig;
};

export type LandingOffer = {
  slug: string;
  href: string;
  title: string;
  image: string;
  imageAlt: string;
  variantTitle?: string;
  price: number;
  discountPrice: number;
  inStock: boolean;
};

function hasDiscount<T extends OfferPrice>(
  item: T,
): item is T & { discountPrice: number } {
  return (
    Number.isSafeInteger(item.price) &&
    typeof item.discountPrice === "number" &&
    Number.isSafeInteger(item.discountPrice) &&
    item.discountPrice >= 0 &&
    item.discountPrice < item.price
  );
}

export function getLandingOffer(product: LandingOfferProduct): LandingOffer | null {
  const variant =
    product.productType === "multi"
      ? product.variants
          ?.filter(
            (item) =>
              item.isActive !== false &&
              item._id &&
              isVariantMappedForSale(product.variantSelector, item._id.toString()) &&
              hasDiscount(item),
          )
          .sort(
            (a, b) =>
              Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0) ||
              (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price),
          )[0]
      : undefined;
  const item = product.productType === "multi" ? variant : product;
  if (!item || !hasDiscount(item)) return null;

  const href = "/product/" + product.slug;

  return {
    slug: product.slug,
    href: variant ? href + "?variant=" + encodeURIComponent(variant._id.toString()) : href,
    title: product.title,
    image: product.mainImage,
    imageAlt: product.mainImageAlt || product.title,
    variantTitle: variant?.title,
    price: item.price,
    discountPrice: item.discountPrice,
    inStock: (item.stock ?? 0) > 0,
  };
}
