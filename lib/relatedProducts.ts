export type RelatedProduct = {
  _id: string;
  title: string;
  slug: string;
  mainImage: string;
  price: number;
  discountPrice?: number | null;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function emptyRelatedProducts(): { relatedProducts: RelatedProduct[] } {
  return { relatedProducts: [] };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function isRelatedProduct(value: unknown): value is RelatedProduct {
  if (typeof value !== "object" || value === null) return false;

  const product = value as Record<string, unknown>;
  const discountPrice = product.discountPrice;

  return (
    isNonEmptyString(product._id) &&
    isNonEmptyString(product.title) &&
    isNonEmptyString(product.slug) &&
    isNonEmptyString(product.mainImage) &&
    isNonNegativeSafeInteger(product.price) &&
    (discountPrice === undefined ||
      discountPrice === null ||
      isNonNegativeSafeInteger(discountPrice))
  );
}

export function parseRelatedProductsResponse(
  payload: unknown,
): { relatedProducts: RelatedProduct[] } {
  if (typeof payload !== "object" || payload === null) {
    return emptyRelatedProducts();
  }

  const products = Reflect.get(payload, "relatedProducts");
  if (!Array.isArray(products)) return emptyRelatedProducts();

  return {
    relatedProducts: products.filter(isRelatedProduct),
  };
}

export async function getRelatedProducts(
  url: string,
  fetcher: FetchLike = fetch,
): Promise<{ relatedProducts: RelatedProduct[] }> {
  try {
    const response = await fetcher(url, { cache: "no-store" });
    if (!response.ok) return emptyRelatedProducts();

    const payload: unknown = await response.json();
    return parseRelatedProductsResponse(payload);
  } catch {
    // Related products are optional and must never break the product page.
    return emptyRelatedProducts();
  }
}
