import dbConnect from "@/lib/mongodb";
import PosDevice from "@/model/PosDevice";
import PosRateLimit from "@/model/PosRateLimit";
import {
  authenticatePosRequestCore,
  type PosAuthDependencies,
  type PosAuthResult,
} from "./auth-core";
import type { PosScope } from "./constants";
import { hashPosRateLimitKey, hashPosToken } from "./token";

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
  const keyHash = hashPosRateLimitKey(rawKey);
  const expiresAt = new Date((windowId + 2) * windowMilliseconds);

  const filter = { bucket, keyHash, windowId };
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt },
  };

  let state;
  try {
    state = await PosRateLimit.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();
  } catch (error: unknown) {
    // Two cold instances can race to create the same fixed-window bucket.
    // The unique index decides the winner; the loser safely increments it.
    if ((error as { code?: number })?.code !== 11000) throw error;
    state = await PosRateLimit.findOneAndUpdate(
      filter,
      { $inc: { count: 1 } },
      { new: true },
    ).lean();
  }

  const allowed = Number(state?.count ?? 0) <= limit;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((windowId + 1) * windowMilliseconds - now) / 1000),
  );

  return { allowed, retryAfterSeconds };
}

const productionDependencies: PosAuthDependencies = {
  hashToken: hashPosToken,
  async findDevice(deviceId, tokenHash) {
    await dbConnect();
    const device = await PosDevice.findOne({ deviceId, tokenHash })
      .select("deviceId name scopes isActive tokenVersion")
      .lean();

    if (!device) return null;
    return {
      deviceId: String(device.deviceId),
      name: String(device.name),
      scopes: device.scopes as PosScope[],
      isActive: Boolean(device.isActive),
      tokenVersion: Number(device.tokenVersion),
    };
  },
  consumeRequestLimit(key) {
    return consumeFixedWindow(
      "requests",
      key,
      positiveIntegerEnv("POS_RATE_LIMIT_REQUESTS_PER_MINUTE", 120, 10_000),
      60,
    );
  },
  consumeFailureLimit(key) {
    return consumeFixedWindow(
      "failures",
      key,
      positiveIntegerEnv("POS_AUTH_FAILURE_LIMIT", 10, 1_000),
      positiveIntegerEnv("POS_AUTH_FAILURE_WINDOW_SECONDS", 900, 86_400),
    );
  },
  async touchDevice(deviceId) {
    await dbConnect();
    await PosDevice.updateOne({ deviceId }, { $set: { lastSeenAt: new Date() } });
  },
};

export function authenticatePosRequest(
  request: Request,
  requiredScopes: readonly PosScope[],
): Promise<PosAuthResult> {
  return authenticatePosRequestCore(
    request,
    requiredScopes,
    productionDependencies,
  );
}
