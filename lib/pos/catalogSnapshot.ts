import type { PosAuthorizationResult } from "./auth";

export const POS_CATALOG_SCHEMA_VERSION = 1;
export const POS_CATALOG_DEFAULT_LIMIT = 100;
export const POS_CATALOG_MAX_LIMIT = 200;
export const POS_CATALOG_CONSISTENCY = "best-effort" as const;

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/;
const PAGE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export type CatalogSnapshotErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_LIMIT"
  | "INVALID_PAGE_TOKEN"
  | "INTERNAL_ERROR";

export type CatalogSnapshotVariant = {
  variantId: string;
  title: string;
  sku: string | null;
  priceToman: number;
  discountedPriceToman: number | null;
  centralStock: number;
};

export type CatalogSnapshotItem = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  status: "draft" | "published";
  productType: "single" | "multi";
  basePriceToman: number;
  discountedPriceToman: number | null;
  centralStock: number;
  category: {
    id: string;
    name: string;
  };
  imageUrl: string;
  catalogRevision: number;
  inventoryVersion: number;
  siteCreatedAtUtc: string;
  siteUpdatedAtUtc: string;
  variants: CatalogSnapshotVariant[];
};

export type CatalogSnapshotPage = {
  schemaVersion: 1;
  generatedAtUtc: string;
  consistency: typeof POS_CATALOG_CONSISTENCY;
  invalidItemCount: number;
  items: CatalogSnapshotItem[];
  nextPageToken: string | null;
};

export type CatalogPageFetch = (input: {
  afterId: string | null;
  limit: number;
}) => Promise<readonly unknown[]>;

type CatalogSnapshotDependencies = {
  authorize(request: Request): Promise<PosAuthorizationResult>;
  fetchPage: CatalogPageFetch;
  now?: () => Date;
  logInvalidItem?: (entry: {
    event: "pos.catalog.invalid_product";
    productId: string;
    reasonCode: string;
  }) => void;
  logInternalError?: (entry: {
    event: "pos.catalog.snapshot_failed";
    errorType: string;
  }) => void;
};

type SerializationResult =
  | { kind: "valid"; item: CatalogSnapshotItem }
  | { kind: "excluded" }
  | { kind: "invalid"; productId: string; reasonCode: string };

class CatalogRequestError extends Error {
  readonly code: "INVALID_LIMIT" | "INVALID_PAGE_TOKEN";

  constructor(
    code: "INVALID_LIMIT" | "INVALID_PAGE_TOKEN",
    message: string,
  ) {
    super(message);
    this.name = "CatalogRequestError";
    this.code = code;
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorResponse(
  code: CatalogSnapshotErrorCode,
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: { code, message } }, status);
}

function parseLimit(value: string | null): number {
  if (value === null) return POS_CATALOG_DEFAULT_LIMIT;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new CatalogRequestError(
      "INVALID_LIMIT",
      `limit must be an integer between 1 and ${POS_CATALOG_MAX_LIMIT}.`,
    );
  }

  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit > POS_CATALOG_MAX_LIMIT) {
    throw new CatalogRequestError(
      "INVALID_LIMIT",
      `limit must be an integer between 1 and ${POS_CATALOG_MAX_LIMIT}.`,
    );
  }

  return limit;
}

export function encodeCatalogPageToken(lastSeenId: string): string {
  if (!OBJECT_ID_PATTERN.test(lastSeenId)) {
    throw new Error("Cannot encode an invalid catalog cursor");
  }

  return Buffer.from(
    JSON.stringify({ version: 1, lastSeenId }),
    "utf8",
  ).toString("base64url");
}

export function decodeCatalogPageToken(token: string): string {
  if (
    token.length === 0 ||
    token.length > 256 ||
    !PAGE_TOKEN_PATTERN.test(token)
  ) {
    throw new CatalogRequestError(
      "INVALID_PAGE_TOKEN",
      "pageToken is invalid.",
    );
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as unknown;
    if (!decoded || typeof decoded !== "object") throw new Error("invalid");

    const cursor = decoded as Record<string, unknown>;
    if (
      Object.keys(cursor).length !== 2 ||
      cursor.version !== 1 ||
      typeof cursor.lastSeenId !== "string" ||
      !OBJECT_ID_PATTERN.test(cursor.lastSeenId) ||
      encodeCatalogPageToken(cursor.lastSeenId) !== token
    ) {
      throw new Error("invalid");
    }

    return cursor.lastSeenId;
  } catch (error) {
    if (error instanceof CatalogRequestError) throw error;
    throw new CatalogRequestError(
      "INVALID_PAGE_TOKEN",
      "pageToken is invalid.",
    );
  }
}

function objectIdString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return OBJECT_ID_PATTERN.test(normalized) ? normalized : null;
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      toHexString?: () => string;
      _id?: unknown;
    };
    if (typeof candidate.toHexString === "function") {
      return objectIdString(candidate.toHexString());
    }
    if (candidate._id !== undefined) {
      return objectIdString(candidate._id);
    }
  }

  return null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function optionalDiscount(value: unknown, price: number): number | null | false {
  if (value === null || value === undefined) return null;
  if (!nonNegativeSafeInteger(value) || value > price) return false;
  return value;
}

function revisionValue(value: unknown): number | null {
  if (value === null || value === undefined) return 0;
  return nonNegativeSafeInteger(value) ? value : null;
}

function utcDateString(value: unknown): string | null {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function invalid(
  productId: string,
  reasonCode: string,
): SerializationResult {
  return { kind: "invalid", productId, reasonCode };
}

export function serializeCatalogProduct(rawValue: unknown): SerializationResult {
  if (!rawValue || typeof rawValue !== "object") {
    return invalid("unknown", "INVALID_PRODUCT");
  }

  const raw = rawValue as Record<string, unknown>;
  const productId = objectIdString(raw._id) ?? "unknown";

  if (raw.deletedAt !== null && raw.deletedAt !== undefined) {
    return { kind: "excluded" };
  }

  const id = objectIdString(raw._id);
  const name = nonEmptyString(raw.title);
  const slug = nonEmptyString(raw.slug);
  const sku = nonEmptyString(raw.sku);
  const imageUrl = nonEmptyString(raw.mainImage);
  if (!id || !name || !slug || !sku || !imageUrl) {
    return invalid(productId, "INVALID_IDENTITY");
  }

  if (raw.status !== "draft" && raw.status !== "published") {
    return invalid(productId, "INVALID_STATUS");
  }
  if (raw.productType !== "single" && raw.productType !== "multi") {
    return invalid(productId, "INVALID_PRODUCT_TYPE");
  }

  if (!nonNegativeSafeInteger(raw.price)) {
    return invalid(productId, "INVALID_PRICE");
  }
  const discountedPrice = optionalDiscount(raw.discountPrice, raw.price);
  if (discountedPrice === false) {
    return invalid(productId, "INVALID_DISCOUNT_PRICE");
  }
  if (!nonNegativeSafeInteger(raw.stock)) {
    return invalid(productId, "INVALID_STOCK");
  }

  const category =
    raw.category && typeof raw.category === "object"
      ? (raw.category as Record<string, unknown>)
      : null;
  const categoryId = category ? objectIdString(category._id) : null;
  const categoryName = category ? nonEmptyString(category.name) : null;
  if (!categoryId || !categoryName) {
    return invalid(productId, "INVALID_CATEGORY");
  }

  const catalogRevision = revisionValue(raw.catalogRevision);
  const inventoryVersion = revisionValue(raw.inventoryVersion);
  if (catalogRevision === null || inventoryVersion === null) {
    return invalid(productId, "INVALID_REVISION");
  }

  const createdAt = utcDateString(raw.createdAt);
  const updatedAt = utcDateString(raw.updatedAt);
  if (!createdAt || !updatedAt) {
    return invalid(productId, "INVALID_TIMESTAMP");
  }

  const variants: CatalogSnapshotVariant[] = [];
  if (raw.productType === "multi") {
    if (!Array.isArray(raw.variants)) {
      return invalid(productId, "INVALID_VARIANTS");
    }

    let derivedStock = 0;
    for (const rawVariant of raw.variants) {
      if (!rawVariant || typeof rawVariant !== "object") {
        return invalid(productId, "INVALID_VARIANT");
      }
      const variant = rawVariant as Record<string, unknown>;
      const variantId = objectIdString(variant._id);
      const title = nonEmptyString(variant.title);
      if (
        !variantId ||
        !title ||
        !nonNegativeSafeInteger(variant.price) ||
        !nonNegativeSafeInteger(variant.stock)
      ) {
        return invalid(productId, "INVALID_VARIANT");
      }

      const variantDiscount = optionalDiscount(
        variant.discountPrice,
        variant.price,
      );
      if (variantDiscount === false) {
        return invalid(productId, "INVALID_VARIANT_DISCOUNT");
      }

      derivedStock += variant.stock;
      if (!Number.isSafeInteger(derivedStock)) {
        return invalid(productId, "UNSAFE_VARIANT_STOCK_SUM");
      }

      const variantSku =
        variant.sku === null || variant.sku === undefined || variant.sku === ""
          ? null
          : nonEmptyString(variant.sku);
      if (
        variant.sku !== null &&
        variant.sku !== undefined &&
        variant.sku !== "" &&
        variantSku === null
      ) {
        return invalid(productId, "INVALID_VARIANT_SKU");
      }

      variants.push({
        variantId,
        title,
        sku: variantSku,
        priceToman: variant.price,
        discountedPriceToman: variantDiscount,
        centralStock: variant.stock,
      });
    }

    if (derivedStock !== raw.stock) {
      return invalid(productId, "VARIANT_STOCK_MISMATCH");
    }
  }

  return {
    kind: "valid",
    item: {
      productId: id,
      name,
      slug,
      sku,
      status: raw.status,
      productType: raw.productType,
      basePriceToman: raw.price,
      discountedPriceToman: discountedPrice,
      centralStock: raw.stock,
      category: {
        id: categoryId,
        name: categoryName,
      },
      imageUrl,
      catalogRevision,
      inventoryVersion,
      siteCreatedAtUtc: createdAt,
      siteUpdatedAtUtc: updatedAt,
      variants,
    },
  };
}

export async function handleCatalogSnapshotRequest(
  request: Request,
  dependencies: CatalogSnapshotDependencies,
): Promise<Response> {
  try {
    const authorization = await dependencies.authorize(request);
    if (!authorization.ok) {
      return errorResponse(
        authorization.code,
        authorization.message,
        authorization.status,
      );
    }

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const pageToken = url.searchParams.get("pageToken");
    const afterId = pageToken ? decodeCatalogPageToken(pageToken) : null;
    const rows = await dependencies.fetchPage({
      afterId,
      limit: limit + 1,
    });
    const scannedRows = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const items: CatalogSnapshotItem[] = [];
    let invalidItemCount = 0;

    for (const row of scannedRows) {
      const result = serializeCatalogProduct(row);
      if (result.kind === "valid") {
        items.push(result.item);
      } else if (result.kind === "invalid") {
        invalidItemCount += 1;
        const entry = {
          event: "pos.catalog.invalid_product" as const,
          productId: result.productId,
          reasonCode: result.reasonCode,
        };
        if (dependencies.logInvalidItem) {
          dependencies.logInvalidItem(entry);
        } else {
          console.warn(JSON.stringify(entry));
        }
      }
    }

    let nextPageToken: string | null = null;
    if (hasMore && scannedRows.length > 0) {
      const lastSeenId = objectIdString(
        (scannedRows[scannedRows.length - 1] as Record<string, unknown>)._id,
      );
      if (!lastSeenId) throw new Error("Invalid MongoDB cursor");
      nextPageToken = encodeCatalogPageToken(lastSeenId);
    }

    const page: CatalogSnapshotPage = {
      schemaVersion: POS_CATALOG_SCHEMA_VERSION,
      generatedAtUtc: (dependencies.now ?? (() => new Date()))().toISOString(),
      consistency: POS_CATALOG_CONSISTENCY,
      invalidItemCount,
      items,
      nextPageToken,
    };

    return jsonResponse(page);
  } catch (error) {
    if (error instanceof CatalogRequestError) {
      return errorResponse(error.code, error.message, 400);
    }

    const entry = {
      event: "pos.catalog.snapshot_failed" as const,
      errorType: error instanceof Error ? error.name : "UnknownError",
    };
    if (dependencies.logInternalError) {
      dependencies.logInternalError(entry);
    } else {
      console.error(JSON.stringify(entry));
    }

    return errorResponse(
      "INTERNAL_ERROR",
      "The catalog snapshot could not be generated.",
      500,
    );
  }
}
