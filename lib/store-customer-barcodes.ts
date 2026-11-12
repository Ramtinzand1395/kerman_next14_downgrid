export const MAX_CUSTOMER_BARCODE_LENGTH = 128;

export function normalizeCustomerBarcode(value: string) {
  return value.trim();
}

export function isCustomerBarcode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_CUSTOMER_BARCODE_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function isCustomerDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === 11000;
}
