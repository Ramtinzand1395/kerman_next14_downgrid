export const CATALOG_SNAPSHOT_DEFAULT_LIMIT = 100;
export const CATALOG_SNAPSHOT_MAX_LIMIT = 200;
export const CATALOG_VISIBLE_MATCH = Object.freeze({
  status: "published" as const,
  deletedAt: null,
});

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export class CatalogPaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogPaginationError";
  }
}

export type CatalogPagination = {
  limit: number;
  cursorId: string | null;
};

export type CatalogAttribute = {
  groupId: string;
  key: string;
  label: string;
  optionId: string;
  optionLabel: string;
};

export type CatalogVariant = {
  variantId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  basePriceToman: number;
  discountedPriceToman: number | null;
  stock: number;
  isActive: boolean;
  attributes: CatalogAttribute[];
};

export type CatalogSnapshotItem = {
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  productType: "single" | "multi";
  category: {
    categoryId: string;
    name: string;
    slug: string;
  } | null;
  imageUrl: string | null;
  status: "published";
  basePriceToman: number;
  discountedPriceToman: number | null;
  centralStock: number;
  variants: CatalogVariant[];
  catalogRevision: number;
  inventoryVersion: number;
  siteCreatedAtUtc: string | null;
  siteUpdatedAtUtc: string | null;
};

export type CatalogProductSource = Record<string, unknown> & {
  _id: unknown;
};

export type CatalogSnapshotPage = {
  items: CatalogSnapshotItem[];
  syncCursor?: string;
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredLegacyString(value: unknown): string {
  return optionalString(value) ?? "";
}

function nonNegativeSafeInteger(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

function discountPrice(value: unknown, basePrice: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > basePrice
  ) {
    return null;
  }
  return value;
}

function dateToUtc(value: unknown): string | null {
  if (!(value instanceof Date) && typeof value !== "string") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function objectIdString(value: unknown): string {
  const id = String(value ?? "");
  return OBJECT_ID_PATTERN.test(id) ? id.toLowerCase() : "";
}

function readOptionId(optionIds: unknown, groupId: string): string | null {
  if (optionIds instanceof Map) {
    return optionalString(optionIds.get(groupId));
  }
  if (!optionIds || typeof optionIds !== "object") return null;
  return optionalString((optionIds as Record<string, unknown>)[groupId]);
}

function variantAttributes(
  selectorValue: unknown,
  variantId: string,
): CatalogAttribute[] {
  if (!selectorValue || typeof selectorValue !== "object") return [];
  const selector = selectorValue as Record<string, unknown>;
  if (
    selector.enabled !== true ||
    !Array.isArray(selector.groups) ||
    !Array.isArray(selector.mappings)
  ) {
    return [];
  }

  const mapping = selector.mappings.find((value) => {
    if (!value || typeof value !== "object") return false;
    return objectIdString((value as Record<string, unknown>).variantId) === variantId;
  }) as Record<string, unknown> | undefined;
  if (!mapping) return [];

  return [...selector.groups]
    .filter(
      (value): value is Record<string, unknown> =>
        Boolean(value) && typeof value === "object",
    )
    .sort((left, right) =>
      nonNegativeSafeInteger(left.order) - nonNegativeSafeInteger(right.order),
    )
    .flatMap((group) => {
      const groupId = optionalString(group.id);
      const key = optionalString(group.key);
      const label = optionalString(group.label);
      if (!groupId || !key || !label || !Array.isArray(group.options)) return [];
      const optionId = readOptionId(mapping.optionIds, groupId);
      if (!optionId) return [];
      const option = group.options.find(
        (value) =>
          Boolean(value) &&
          typeof value === "object" &&
          optionalString((value as Record<string, unknown>).id) === optionId,
      ) as Record<string, unknown> | undefined;
      const optionLabel = optionalString(option?.label);
      return optionLabel
        ? [{ groupId, key, label, optionId, optionLabel }]
        : [];
    });
}

function mapVariant(
  value: unknown,
  selectorValue: unknown,
): CatalogVariant | null {
  if (!value || typeof value !== "object") return null;
  const variant = value as Record<string, unknown>;
  const variantId = objectIdString(variant._id);
  if (!variantId) return null;
  const basePriceToman = nonNegativeSafeInteger(variant.price);
  return {
    variantId,
    name: requiredLegacyString(variant.title),
    sku: optionalString(variant.sku),
    barcode: optionalString(variant.barcode),
    basePriceToman,
    discountedPriceToman: discountPrice(
      variant.discountPrice,
      basePriceToman,
    ),
    stock: nonNegativeSafeInteger(variant.stock),
    isActive: variant.isActive !== false,
    attributes: variantAttributes(selectorValue, variantId),
  };
}

function mapCategory(value: unknown): CatalogSnapshotItem["category"] {
  if (!value || typeof value !== "object") return null;
  const category = value as Record<string, unknown>;
  const categoryId = objectIdString(category._id);
  const name = optionalString(category.name);
  const slug = optionalString(category.slug);
  return categoryId && name && slug ? { categoryId, name, slug } : null;
}

export function isCatalogProductVisible(source: Record<string, unknown>) {
  return source.status === "published" &&
    (source.deletedAt === null || source.deletedAt === undefined);
}

export function mapCatalogProduct(
  source: CatalogProductSource,
): CatalogSnapshotItem {
  const productType = source.productType === "multi" ? "multi" : "single";
  const variants = Array.isArray(source.variants)
    ? source.variants
        .map((variant) => mapVariant(variant, source.variantSelector))
        .filter((variant): variant is CatalogVariant => variant !== null)
    : [];

  const defaultVariantId = objectIdString(source.defaultVariantId);
  const selectedVariant =
    variants.find(
      (variant) => variant.variantId === defaultVariantId && variant.isActive,
    ) ??
    variants.find((variant) => variant.isActive) ??
    variants[0];

  const singleBasePrice = nonNegativeSafeInteger(source.price);
  const basePriceToman =
    productType === "multi" && selectedVariant
      ? selectedVariant.basePriceToman
      : singleBasePrice;
  const discountedPriceToman =
    productType === "multi" && selectedVariant
      ? selectedVariant.discountedPriceToman
      : discountPrice(source.discountPrice, singleBasePrice);

  let centralStock = nonNegativeSafeInteger(source.stock);
  if (productType === "multi") {
    centralStock = variants
      .filter((variant) => variant.isActive)
      .reduce(
        (sum, variant) =>
          Math.min(Number.MAX_SAFE_INTEGER, sum + variant.stock),
        0,
      );
  }

  return {
    productId: objectIdString(source._id),
    name: requiredLegacyString(source.title),
    slug: requiredLegacyString(source.slug),
    sku: optionalString(source.sku),
    barcode: productType === "single" ? optionalString(source.barcode) : null,
    productType,
    category: mapCategory(source.category),
    imageUrl: optionalString(source.mainImage),
    status: "published",
    basePriceToman,
    discountedPriceToman,
    centralStock,
    variants: productType === "multi" ? variants : [],
    catalogRevision: nonNegativeSafeInteger(source.catalogRevision),
    inventoryVersion: nonNegativeSafeInteger(source.inventoryVersion),
    siteCreatedAtUtc: dateToUtc(source.createdAt),
    siteUpdatedAtUtc: dateToUtc(source.updatedAt),
  };
}

export function encodeCatalogCursor(productId: string): string {
  if (!OBJECT_ID_PATTERN.test(productId)) {
    throw new CatalogPaginationError("Cursor product id is invalid");
  }
  return Buffer.from(
    JSON.stringify({ version: 1, productId: productId.toLowerCase() }),
    "utf8",
  ).toString("base64url");
}

export function decodeCatalogCursor(cursor: string): string {
  if (!cursor || cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw new CatalogPaginationError("Cursor is invalid");
  }
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      !value ||
      typeof value !== "object" ||
      value.version !== 1 ||
      typeof value.productId !== "string" ||
      !OBJECT_ID_PATTERN.test(value.productId)
    ) {
      throw new Error("invalid cursor payload");
    }
    return value.productId.toLowerCase();
  } catch {
    throw new CatalogPaginationError("Cursor is invalid");
  }
}

export function parseCatalogPagination(requestUrl: string): CatalogPagination {
  const url = new URL(requestUrl);
  const rawLimit = url.searchParams.get("limit");
  let limit = CATALOG_SNAPSHOT_DEFAULT_LIMIT;
  if (rawLimit !== null) {
    if (!/^[0-9]+$/.test(rawLimit)) {
      throw new CatalogPaginationError("Limit must be an integer");
    }
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
      throw new CatalogPaginationError("Limit must be between 1 and 200");
    }
  }

  const rawCursor = url.searchParams.get("cursor");
  return {
    limit,
    cursorId: rawCursor ? decodeCatalogCursor(rawCursor) : null,
  };
}

export function createCatalogSnapshotPage(
  documents: readonly CatalogProductSource[],
  limit: number,
): CatalogSnapshotPage {
  const hasMore = documents.length > limit;
  const pageDocuments = documents.slice(0, limit);
  const lastProductId = pageDocuments.length
    ? objectIdString(pageDocuments[pageDocuments.length - 1]._id)
    : "";
  return {
    items: pageDocuments.map(mapCatalogProduct),
    pagination: {
      limit,
      hasMore,
      nextCursor:
        hasMore && lastProductId ? encodeCatalogCursor(lastProductId) : null,
    },
  };
}
