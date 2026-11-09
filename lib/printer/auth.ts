import dbConnect from "@/lib/mongodb";
import PrinterDevice from "@/model/PrinterDevice";
import PrinterRateLimit from "@/model/PrinterRateLimit";
import {
  authenticatePrinterRequestCore,
  type PrinterAuthDependencies,
  type PrinterAuthResult,
} from "./auth-core";
import { readPrintAuthMode, type PrinterScope } from "./constants";
import { hashPrinterRateLimitKey, hashPrinterToken } from "./token";

function positiveIntegerEnv(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) return fallback;
  return Math.min(value, maximum);
}

async function consumeFixedWindow(
  bucket: "requests" | "failures",
  rawKey: string,
  limit: number,
  windowSeconds: number,
) {
  await dbConnect();
  const now = Date.now();
  const windowMilliseconds = windowSeconds * 1000;
  const windowId = Math.floor(now / windowMilliseconds);
  const keyHash = hashPrinterRateLimitKey(rawKey);
  const expiresAt = new Date((windowId + 2) * windowMilliseconds);
  const filter = { bucket, keyHash, windowId };

  let state;
  try {
    state = await PrinterRateLimit.findOneAndUpdate(
      filter,
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
  } catch (error: unknown) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    state = await PrinterRateLimit.findOneAndUpdate(
      filter,
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    ).lean();
  }

  return {
    allowed: Number(state?.count ?? 0) <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(((windowId + 1) * windowMilliseconds - now) / 1000),
    ),
  };
}

const productionDependencies: PrinterAuthDependencies = {
  authMode: readPrintAuthMode,
  hashToken: hashPrinterToken,
  async findDevice(tokenHash) {
    await dbConnect();
    const device = await PrinterDevice.findOne({ tokenHash })
      .select("deviceId name scopes isActive tokenVersion")
      .lean();
    if (!device) return null;
    return {
      deviceId: String(device.deviceId),
      name: String(device.name),
      scopes: device.scopes as PrinterScope[],
      isActive: Boolean(device.isActive),
      tokenVersion: Number(device.tokenVersion),
    };
  },
  consumeRequestLimit(key) {
    return consumeFixedWindow(
      "requests",
      key,
      positiveIntegerEnv("PRINT_RATE_LIMIT_REQUESTS_PER_MINUTE", 60, 10_000),
      60,
    );
  },
  consumeFailureLimit(key) {
    return consumeFixedWindow(
      "failures",
      key,
      positiveIntegerEnv("PRINT_AUTH_FAILURE_LIMIT", 10, 1_000),
      positiveIntegerEnv("PRINT_AUTH_FAILURE_WINDOW_SECONDS", 900, 86_400),
    );
  },
  async touchDevice(deviceId) {
    await dbConnect();
    await PrinterDevice.updateOne(
      { deviceId },
      { $set: { lastSeenAt: new Date() } },
    );
  },
};

export function authenticatePrinterRequest(
  request: Request,
  requiredScopes: readonly PrinterScope[],
): Promise<PrinterAuthResult> {
  return authenticatePrinterRequestCore(
    request,
    requiredScopes,
    productionDependencies,
  );
}

export function printerConsumerId(deviceId: string): string {
  return `printer:${deviceId}`;
}
