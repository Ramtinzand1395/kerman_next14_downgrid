export type PosSaleConflictDetail = {
  productId: string;
  variantId: string | null;
  requestedQuantity?: number;
  availableQuantity?: number;
  reason:
    | "product_not_found"
    | "variant_not_found"
    | "variant_required"
    | "variant_not_allowed"
    | "invalid_catalog_data"
    | "insufficient_stock";
};

export class PosSaleConflictError extends Error {
  readonly code: "POS_SALE_INVENTORY_CONFLICT" | "POS_SALE_CATALOG_CONFLICT";
  readonly conflicts: PosSaleConflictDetail[];

  constructor(
    code: PosSaleConflictError["code"],
    conflicts: PosSaleConflictDetail[],
  ) {
    super(code);
    this.name = "PosSaleConflictError";
    this.code = code;
    this.conflicts = conflicts;
  }
}

export class PosSaleIdempotencyConflictError extends Error {
  readonly code = "POS_SALE_IDEMPOTENCY_CONFLICT";

  constructor() {
    super("saleId was already used with different content");
    this.name = "PosSaleIdempotencyConflictError";
  }
}
