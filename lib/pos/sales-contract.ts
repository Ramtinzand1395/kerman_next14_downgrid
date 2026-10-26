import { createHash } from "node:crypto";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const SALE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_ITEMS = 100;
const MAX_PAYMENT_METHODS = 10;

export const POS_PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "wallet",
  "other",
] as const;

export type PosPaymentMethodName = (typeof POS_PAYMENT_METHODS)[number];

export type ValidatedPosSaleItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPriceToman: number;
  discountToman: number;
  finalAmountToman: number;
};

export type ValidatedPosPaymentMethod = {
  method: PosPaymentMethodName;
  amountToman: number;
  reference: string | null;
};

export type ValidatedPosSaleRequest = {
  saleId: string;
  soldAtUtc: string;
  items: ValidatedPosSaleItem[];
  finalAmountToman: number;
  paymentMethods: ValidatedPosPaymentMethod[];
  customer: {
    customerId: string | null;
    name: string | null;
    mobile: string | null;
  } | null;
  cashier: {
    cashierId: string;
    name: string;
  };
};

export type PosPriceSnapshot = {
  siteBasePriceToman: number;
  siteDiscountedPriceToman: number | null;
  siteEffectivePriceToman: number;
  posNetUnitPriceToman: number;
  differenceToman: number;
  mismatch: boolean;
};

export class PosSaleValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "PosSaleValidationError";
    this.field = field;
  }
}

function safeNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new PosSaleValidationError(
      field,
      `${field} must be a non-negative safe integer`,
    );
  }
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = safeNonNegativeInteger(value, field);
  if (parsed < 1) {
    throw new PosSaleValidationError(field, `${field} must be at least 1`);
  }
  return parsed;
}

function checkedAdd(left: number, right: number, field: string) {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new PosSaleValidationError(field, `${field} exceeds the safe range`);
  }
  return result;
}

function checkedMultiply(left: number, right: number, field: string) {
  const result = left * right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new PosSaleValidationError(field, `${field} exceeds the safe range`);
  }
  return result;
}

function requiredString(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new PosSaleValidationError(field, `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new PosSaleValidationError(field, `${field} is too long`);
  }
  return normalized;
}

function optionalString(value: unknown, field: string, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new PosSaleValidationError(field, `${field} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new PosSaleValidationError(field, `${field} is too long`);
  }
  return normalized;
}

function objectId(value: unknown, field: string) {
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    throw new PosSaleValidationError(field, `${field} is invalid`);
  }
  return value.toLowerCase();
}

function normalizeSoldAt(value: unknown) {
  if (typeof value !== "string" || !value.endsWith("Z")) {
    throw new PosSaleValidationError(
      "soldAtUtc",
      "soldAtUtc must be an ISO UTC timestamp",
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PosSaleValidationError("soldAtUtc", "soldAtUtc is invalid");
  }
  if (parsed.getTime() > Date.now() + 5 * 60_000) {
    throw new PosSaleValidationError(
      "soldAtUtc",
      "soldAtUtc cannot be more than five minutes in the future",
    );
  }
  return parsed.toISOString();
}

function normalizeItems(value: unknown): ValidatedPosSaleItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) {
    throw new PosSaleValidationError(
      "items",
      `items must contain between 1 and ${MAX_ITEMS} entries`,
    );
  }

  const seen = new Set<string>();
  const items = value.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new PosSaleValidationError(`items.${index}`, "item is invalid");
    }
    const item = raw as Record<string, unknown>;
    const productId = objectId(item.productId, `items.${index}.productId`);
    const variantId =
      item.variantId === null ||
      item.variantId === undefined ||
      item.variantId === ""
        ? null
        : objectId(item.variantId, `items.${index}.variantId`);
    const identity = `${productId}:${variantId ?? "single"}`;
    if (seen.has(identity)) {
      throw new PosSaleValidationError(
        `items.${index}`,
        "duplicate product/variant lines are not allowed",
      );
    }
    seen.add(identity);

    const quantity = positiveInteger(item.quantity, `items.${index}.quantity`);
    const unitPriceToman = safeNonNegativeInteger(
      item.unitPriceToman,
      `items.${index}.unitPriceToman`,
    );
    const discountToman = safeNonNegativeInteger(
      item.discountToman ?? 0,
      `items.${index}.discountToman`,
    );
    if (discountToman > unitPriceToman) {
      throw new PosSaleValidationError(
        `items.${index}.discountToman`,
        "discountToman cannot exceed unitPriceToman",
      );
    }
    const finalAmountToman = checkedMultiply(
      unitPriceToman - discountToman,
      quantity,
      `items.${index}.finalAmountToman`,
    );
    return {
      productId,
      variantId,
      quantity,
      unitPriceToman,
      discountToman,
      finalAmountToman,
    };
  });

  return items.sort((left, right) =>
    `${left.productId}:${left.variantId ?? ""}`.localeCompare(
      `${right.productId}:${right.variantId ?? ""}`,
    ),
  );
}

function normalizePaymentMethods(
  value: unknown,
): ValidatedPosPaymentMethod[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_PAYMENT_METHODS
  ) {
    throw new PosSaleValidationError(
      "paymentMethods",
      `paymentMethods must contain between 1 and ${MAX_PAYMENT_METHODS} entries`,
    );
  }
  const accepted = new Set<string>(POS_PAYMENT_METHODS);
  return value
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") {
        throw new PosSaleValidationError(
          `paymentMethods.${index}`,
          "payment method is invalid",
        );
      }
      const method = (raw as Record<string, unknown>).method;
      if (typeof method !== "string" || !accepted.has(method)) {
        throw new PosSaleValidationError(
          `paymentMethods.${index}.method`,
          "payment method is invalid",
        );
      }
      return {
        method: method as PosPaymentMethodName,
        amountToman: safeNonNegativeInteger(
          (raw as Record<string, unknown>).amountToman,
          `paymentMethods.${index}.amountToman`,
        ),
        reference: optionalString(
          (raw as Record<string, unknown>).reference,
          `paymentMethods.${index}.reference`,
          120,
        ),
      };
    })
    .sort((left, right) =>
      `${left.method}:${left.reference ?? ""}:${left.amountToman}`.localeCompare(
        `${right.method}:${right.reference ?? ""}:${right.amountToman}`,
      ),
    );
}

export function validatePosSaleRequest(
  raw: unknown,
): ValidatedPosSaleRequest {
  if (!raw || typeof raw !== "object") {
    throw new PosSaleValidationError("body", "request body is invalid");
  }
  const body = raw as Record<string, unknown>;
  const saleId = requiredString(body.saleId, "saleId", 128);
  if (!SALE_ID_PATTERN.test(saleId)) {
    throw new PosSaleValidationError("saleId", "saleId format is invalid");
  }
  const items = normalizeItems(body.items);
  const computedFinal = items.reduce(
    (sum, item) => checkedAdd(sum, item.finalAmountToman, "finalAmountToman"),
    0,
  );
  const finalAmountToman = safeNonNegativeInteger(
    body.finalAmountToman,
    "finalAmountToman",
  );
  if (computedFinal !== finalAmountToman) {
    throw new PosSaleValidationError(
      "finalAmountToman",
      "finalAmountToman does not match item totals",
    );
  }
  const paymentMethods = normalizePaymentMethods(body.paymentMethods);
  const paymentTotal = paymentMethods.reduce(
    (sum, payment) =>
      checkedAdd(sum, payment.amountToman, "paymentMethods.amountToman"),
    0,
  );
  if (paymentTotal !== finalAmountToman) {
    throw new PosSaleValidationError(
      "paymentMethods",
      "payment method totals do not match finalAmountToman",
    );
  }

  let customer: ValidatedPosSaleRequest["customer"] = null;
  if (body.customer !== null && body.customer !== undefined) {
    if (typeof body.customer !== "object") {
      throw new PosSaleValidationError("customer", "customer is invalid");
    }
    const value = body.customer as Record<string, unknown>;
    customer = {
      customerId: optionalString(value.customerId, "customer.customerId", 100),
      name: optionalString(value.name, "customer.name", 120),
      mobile: optionalString(value.mobile, "customer.mobile", 30),
    };
  }

  if (!body.cashier || typeof body.cashier !== "object") {
    throw new PosSaleValidationError("cashier", "cashier is required");
  }
  const cashierValue = body.cashier as Record<string, unknown>;

  return {
    saleId,
    soldAtUtc: normalizeSoldAt(body.soldAtUtc),
    items,
    finalAmountToman,
    paymentMethods,
    customer,
    cashier: {
      cashierId: requiredString(
        cashierValue.cashierId,
        "cashier.cashierId",
        100,
      ),
      name: requiredString(cashierValue.name, "cashier.name", 120),
    },
  };
}

export function fingerprintPosSaleRequest(
  request: ValidatedPosSaleRequest,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ version: 1, ...request }))
    .digest("hex");
}

export function createPosPriceSnapshot(input: {
  siteBasePriceToman: number;
  siteDiscountedPriceToman: number | null;
  posUnitPriceToman: number;
  posDiscountToman: number;
}): PosPriceSnapshot {
  const siteEffectivePriceToman =
    input.siteDiscountedPriceToman ?? input.siteBasePriceToman;
  const posNetUnitPriceToman =
    input.posUnitPriceToman - input.posDiscountToman;
  const differenceToman = posNetUnitPriceToman - siteEffectivePriceToman;
  if (!Number.isSafeInteger(differenceToman)) {
    throw new PosSaleValidationError(
      "items.unitPriceToman",
      "price difference exceeds the safe range",
    );
  }
  return {
    siteBasePriceToman: input.siteBasePriceToman,
    siteDiscountedPriceToman: input.siteDiscountedPriceToman,
    siteEffectivePriceToman,
    posNetUnitPriceToman,
    differenceToman,
    mismatch: differenceToman !== 0,
  };
}

export function isLateOfflineSale(soldAtUtc: string, syncedAt: Date) {
  const configured = Number(process.env.POS_OFFLINE_SALE_REVIEW_AFTER_MINUTES);
  const thresholdMinutes =
    Number.isSafeInteger(configured) && configured >= 1
      ? Math.min(configured, 43_200)
      : 15;
  return syncedAt.getTime() - new Date(soldAtUtc).getTime() > thresholdMinutes * 60_000;
}
