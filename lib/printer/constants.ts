export const PRINTER_TOKEN_PREFIX = "kprinter_v1_";
export const PRINTER_DEVICE_ID_PATTERN =
  /^printer_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PRINTER_SCOPES = ["queue:read", "queue:ack"] as const;
export type PrinterScope = (typeof PRINTER_SCOPES)[number];

export type PrintAuthMode = "required" | "compatibility";

export function readPrintAuthMode(
  value = process.env.PRINT_API_AUTH_MODE,
): PrintAuthMode | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "required" || normalized === "compatibility"
    ? normalized
    : null;
}

export function isPrinterScope(value: unknown): value is PrinterScope {
  return (
    typeof value === "string" &&
    (PRINTER_SCOPES as readonly string[]).includes(value)
  );
}
