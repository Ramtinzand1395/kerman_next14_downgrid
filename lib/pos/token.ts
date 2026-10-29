import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { POS_TOKEN_PREFIX } from "./constants.ts";

const TOKEN_PATTERN = /^kpos_v1_[A-Za-z0-9_-]{43}$/;

export function generatePosDeviceId(): string {
  return `pos_${randomUUID()}`;
}

export function generatePosToken(): string {
  return `${POS_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isValidPosTokenFormat(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function getPosTokenPepper(): string {
  const pepper = process.env.POS_TOKEN_PEPPER?.trim();
  if (!pepper || Buffer.byteLength(pepper, "utf8") < 32) {
    throw new Error("POS_TOKEN_PEPPER must contain at least 32 bytes");
  }
  return pepper;
}

export function hashPosToken(token: string, pepper = getPosTokenPepper()): string {
  return createHmac("sha256", pepper).update(token, "utf8").digest("hex");
}

export function hashPosRateLimitKey(
  value: string,
  pepper = getPosTokenPepper(),
): string {
  return createHmac("sha256", pepper)
    .update(`rate-limit:${value}`, "utf8")
    .digest("hex");
}
