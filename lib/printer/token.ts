import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { PRINTER_TOKEN_PREFIX } from "./constants.ts";

const TOKEN_PATTERN = /^kprinter_v1_[A-Za-z0-9_-]{43}$/;

export function generatePrinterDeviceId(): string {
  return `printer_${randomUUID()}`;
}

export function generatePrinterToken(): string {
  return `${PRINTER_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isValidPrinterTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function getPrinterTokenPepper(): string {
  const pepper = process.env.PRINT_TOKEN_PEPPER?.trim();
  if (!pepper || Buffer.byteLength(pepper, "utf8") < 32) {
    throw new Error("PRINT_TOKEN_PEPPER must contain at least 32 bytes");
  }
  return pepper;
}

export function hashPrinterToken(
  token: string,
  pepper = getPrinterTokenPepper(),
): string {
  return createHmac("sha256", pepper).update(token, "utf8").digest("hex");
}

export function hashPrinterRateLimitKey(
  value: string,
  pepper = getPrinterTokenPepper(),
): string {
  return createHmac("sha256", pepper)
    .update(`printer-rate-limit:${value}`, "utf8")
    .digest("hex");
}
