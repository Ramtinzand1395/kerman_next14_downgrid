import type { CatalogSnapshotItem } from "./catalog.ts";

export const CATALOG_CHANGES_DEFAULT_LIMIT = 100;
export const CATALOG_CHANGES_MAX_LIMIT = 200;
export const POS_CATALOG_COUNTER_KEY = "pos-catalog-v1";

export const CATALOG_CHANGE_KINDS = [
  "catalog",
  "price",
  "variants",
  "inventory",
  "status",
] as const;

export type CatalogChangeKind = (typeof CATALOG_CHANGE_KINDS)[number];
export type CatalogChangeEventType = "created" | "updated" | "deleted";
export type CatalogChangeAction = "upsert" | "remove";

export type CatalogChangeItem = {
  sequence: number;
  eventId: string;
  productId: string;
  eventType: CatalogChangeEventType;
  changes: CatalogChangeKind[];
  action: CatalogChangeAction;
  product: CatalogSnapshotItem | null;
  catalogRevision: number;
  inventoryVersion: number;
  occurredAtUtc: string;
};

export type CatalogChangesPagination = {
  limit: number;
  afterSequence: number;
};

export type CatalogChangesPageResult =
  | {
      ok: true;
      items: CatalogChangeItem[];
      pagination: {
        limit: number;
        hasMore: boolean;
        nextCursor: string;
        highWaterCursor: string;
      };
    }
  | {
      ok: false;
      reason: "cursor_ahead" | "history_unavailable";
      minimumAvailableCursor: string | null;
      highWaterCursor: string;
    };

export class CatalogChangesPaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogChangesPaginationError";
  }
}

function safeSequence(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

export function encodeCatalogChangesCursor(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new CatalogChangesPaginationError("Cursor sequence is invalid");
  }

  return Buffer.from(JSON.stringify({ version: 1, sequence }), "utf8").toString(
    "base64url",
  );
}

export function decodeCatalogChangesCursor(cursor: string): number {
  if (!cursor || cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw new CatalogChangesPaginationError("Cursor is invalid");
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      !decoded ||
      typeof decoded !== "object" ||
      decoded.version !== 1 ||
      !Number.isSafeInteger(decoded.sequence) ||
      decoded.sequence < 0
    ) {
      throw new Error("invalid cursor payload");
    }
    return decoded.sequence;
  } catch {
    throw new CatalogChangesPaginationError("Cursor is invalid");
  }
}

export function parseCatalogChangesPagination(
  requestUrl: string,
): CatalogChangesPagination {
  const url = new URL(requestUrl);
  const rawLimit = url.searchParams.get("limit");
  let limit = CATALOG_CHANGES_DEFAULT_LIMIT;

  if (rawLimit !== null) {
    if (!/^[0-9]+$/.test(rawLimit)) {
      throw new CatalogChangesPaginationError("Limit must be an integer");
    }
    limit = Number(rawLimit);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > CATALOG_CHANGES_MAX_LIMIT
    ) {
      throw new CatalogChangesPaginationError(
        `Limit must be between 1 and ${CATALOG_CHANGES_MAX_LIMIT}`,
      );
    }
  }

  const rawCursor = url.searchParams.get("cursor");
  return {
    limit,
    afterSequence: rawCursor ? decodeCatalogChangesCursor(rawCursor) : 0,
  };
}

function objectId(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function inventoryState(value: Record<string, any> | null | undefined) {
  if (!value) return null;
  const variants = Array.isArray(value.variants)
    ? value.variants
        .map((variant: Record<string, unknown>) => ({
          variantId: objectId(variant?._id),
          stock: safeSequence(variant?.stock),
          isActive: variant?.isActive !== false,
        }))
        .sort((left, right) => left.variantId.localeCompare(right.variantId))
    : [];

  return {
    productType: value.productType === "multi" ? "multi" : "single",
    stock: safeSequence(value.stock),
    variants,
  };
}

function pricingState(value: Record<string, any> | null | undefined) {
  if (!value) return null;
  return {
    price: value.price ?? null,
    discountPrice: value.discountPrice ?? null,
    variants: Array.isArray(value.variants)
      ? value.variants
          .map((variant: Record<string, unknown>) => ({
            variantId: objectId(variant?._id),
            price: variant?.price ?? null,
            discountPrice: variant?.discountPrice ?? null,
          }))
          .sort((left, right) => left.variantId.localeCompare(right.variantId))
      : [],
  };
}

function variantsState(value: Record<string, any> | null | undefined) {
  if (!value) return null;
  return {
    productType: value.productType,
    defaultVariantId: objectId(value.defaultVariantId),
    variantSelector: value.variantSelector ?? null,
    variants: Array.isArray(value.variants)
      ? value.variants
          .map((variant: Record<string, unknown>) => ({
            variantId: objectId(variant?._id),
            title: variant?.title ?? null,
            sku: variant?.sku ?? null,
            barcode: variant?.barcode ?? null,
            isActive: variant?.isActive !== false,
          }))
          .sort((left, right) => left.variantId.localeCompare(right.variantId))
      : [],
  };
}

function catalogState(value: Record<string, any> | null | undefined) {
  if (!value) return null;
  return {
    title: value.title ?? null,
    slug: value.slug ?? null,
    sku: value.sku ?? null,
    barcode: value.barcode ?? null,
    category: objectId(value.category?._id ?? value.category),
    mainImage: value.mainImage ?? null,
    productType: value.productType ?? null,
  };
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function hasInventoryStateChanged(
  previous: Record<string, any>,
  next: Record<string, any>,
) {
  return !same(inventoryState(previous), inventoryState(next));
}

export function detectCatalogChangeKinds(
  previous: Record<string, any>,
  next: Record<string, any>,
): CatalogChangeKind[] {
  const changes: CatalogChangeKind[] = [];
  if (!same(catalogState(previous), catalogState(next))) changes.push("catalog");
  if (!same(pricingState(previous), pricingState(next))) changes.push("price");
  if (!same(variantsState(previous), variantsState(next))) changes.push("variants");
  if (hasInventoryStateChanged(previous, next)) changes.push("inventory");
  if (
    previous.status !== next.status ||
    String(previous.deletedAt ?? "") !== String(next.deletedAt ?? "")
  ) {
    changes.push("status");
  }
  return changes.length ? changes : ["catalog"];
}

export function createCatalogChangesPage(
  events: readonly CatalogChangeItem[],
  pagination: CatalogChangesPagination,
  highWaterSequence: number,
  earliestSequence: number | null,
): CatalogChangesPageResult {
  const highWaterCursor = encodeCatalogChangesCursor(highWaterSequence);
  const minimumAvailableCursor =
    earliestSequence === null
      ? null
      : encodeCatalogChangesCursor(Math.max(0, earliestSequence - 1));

  if (pagination.afterSequence > highWaterSequence) {
    return {
      ok: false,
      reason: "cursor_ahead",
      minimumAvailableCursor,
      highWaterCursor,
    };
  }

  if (
    (earliestSequence !== null &&
      pagination.afterSequence < earliestSequence - 1) ||
      (earliestSequence === null &&
        pagination.afterSequence < highWaterSequence)
  ) {
    return {
      ok: false,
      reason: "history_unavailable",
      minimumAvailableCursor,
      highWaterCursor,
    };
  }

  const hasMore = events.length > pagination.limit;
  const items = events.slice(0, pagination.limit);
  const lastSequence = items.length
    ? items[items.length - 1].sequence
    : pagination.afterSequence;
  return {
    ok: true,
    items,
    pagination: {
      limit: pagination.limit,
      hasMore,
      nextCursor: encodeCatalogChangesCursor(lastSequence),
      highWaterCursor,
    },
  };
}

export async function executeAtomicCatalogMutation<T, TTransaction>(input: {
  transaction: (
    operation: (transaction: TTransaction) => Promise<T>,
  ) => Promise<T>;
  mutate: (transaction: TTransaction) => Promise<T>;
  append: (result: T, transaction: TTransaction) => Promise<void>;
}) {
  return input.transaction(async (transaction) => {
    const result = await input.mutate(transaction);
    await input.append(result, transaction);
    return result;
  });
}

