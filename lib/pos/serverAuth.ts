import { createHash } from "node:crypto";

import dbConnect from "@/lib/mongodb";
import PosAuthChallenge from "@/model/PosAuthChallenge";
import PosAuthRateLimit from "@/model/PosAuthRateLimit";
import PosDevice from "@/model/PosDevice";
import {
  PosAuthConfigurationError,
  type PosAccessTokenConfig,
  type PosCredentialVerifier,
  type PosDeviceAuthRecord,
  type PosEnvironment,
  createPosCredentialVerifier,
  normalizePosPem,
} from "./auth";
import type {
  PosAuthChallengeRecord,
  PosAuthRateLimitDecision,
  PosAuthServiceDependencies,
} from "./authService";

const RATE_LIMITS = {
  challenge: {
    windowSeconds: 5 * 60,
    deviceMax: 10,
    ipMax: 30,
  },
  token: {
    windowSeconds: 5 * 60,
    deviceMax: 20,
    ipMax: 60,
  },
} as const;

function requiredEnvironment(): PosEnvironment {
  const value = process.env.POS_ENVIRONMENT;
  if (value === "test" || value === "staging" || value === "production") {
    return value;
  }
  throw new PosAuthConfigurationError();
}

export function getPosAccessTokenConfigFromEnvironment(
  requirePrivateKey: boolean,
): PosAccessTokenConfig {
  const config: PosAccessTokenConfig = {
    issuer: process.env.POS_ACCESS_TOKEN_ISSUER?.trim() ?? "",
    audience: process.env.POS_ACCESS_TOKEN_AUDIENCE?.trim() ?? "",
    environment: requiredEnvironment(),
    publicKey: normalizePosPem(process.env.POS_ACCESS_TOKEN_PUBLIC_KEY),
    ...(requirePrivateKey
      ? {
          privateKey: normalizePosPem(process.env.POS_ACCESS_TOKEN_PRIVATE_KEY),
        }
      : {}),
  };
  if (
    !config.issuer ||
    !config.audience ||
    !config.publicKey ||
    (requirePrivateKey && !config.privateKey)
  ) {
    throw new PosAuthConfigurationError();
  }
  return config;
}

function normalizeDevice(value: unknown): PosDeviceAuthRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, any>;
  const credential = raw.credential;
  if (
    typeof raw.deviceId !== "string" ||
    !credential ||
    typeof credential.publicKey !== "string" ||
    typeof credential.algorithm !== "string" ||
    typeof credential.keyId !== "string" ||
    !Array.isArray(raw.scopes) ||
    !raw.scopes.every((scope: unknown) => typeof scope === "string") ||
    (raw.environment !== "test" &&
      raw.environment !== "staging" &&
      raw.environment !== "production")
  ) {
    return null;
  }
  return {
    deviceId: raw.deviceId,
    credential: {
      publicKey: credential.publicKey,
      algorithm: credential.algorithm,
      keyId: credential.keyId,
    },
    status: String(raw.status),
    scopes: raw.scopes,
    environment: raw.environment,
    revokedAt: raw.revokedAt instanceof Date ? raw.revokedAt : null,
  };
}

async function findDevice(
  deviceId: string,
  environment: PosEnvironment,
): Promise<PosDeviceAuthRecord | null> {
  await dbConnect();
  const value = await PosDevice.findOne({ deviceId, environment })
    .select(
      "deviceId credential.publicKey credential.algorithm credential.keyId status scopes environment revokedAt",
    )
    .lean();
  return normalizeDevice(value);
}

function normalizeChallenge(value: unknown): PosAuthChallengeRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, any>;
  if (
    typeof raw.challengeId !== "string" ||
    typeof raw.deviceId !== "string" ||
    typeof raw.challengeHash !== "string" ||
    !(raw.createdAt instanceof Date) ||
    !(raw.expiresAt instanceof Date) ||
    !Number.isSafeInteger(raw.attemptCount) ||
    (raw.environment !== "test" &&
      raw.environment !== "staging" &&
      raw.environment !== "production")
  ) {
    return null;
  }
  return {
    challengeId: raw.challengeId,
    deviceId: raw.deviceId,
    environment: raw.environment,
    challengeHash: raw.challengeHash,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    consumedAt: raw.consumedAt instanceof Date ? raw.consumedAt : null,
    attemptCount: raw.attemptCount,
  };
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim();
  if (!candidate || candidate.length > 128) return null;
  return candidate;
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000,
  );
}

async function acquireRateBucket(input: {
  endpoint: "challenge" | "token";
  dimension: "device" | "ip";
  value: string;
  limit: number;
  windowSeconds: number;
  now: Date;
}): Promise<boolean> {
  await dbConnect();
  const windowMs = input.windowSeconds * 1000;
  const bucketStart = Math.floor(input.now.getTime() / windowMs) * windowMs;
  const key = createHash("sha256")
    .update(
      `pos-auth:${requiredEnvironment()}:${input.endpoint}:${input.dimension}:${input.value}:${bucketStart}`,
      "utf8",
    )
    .digest("hex");
  try {
    const acquired = await PosAuthRateLimit.findOneAndUpdate(
      { key, count: { $lt: input.limit } },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          key,
          createdAt: new Date(bucketStart),
          expiresAt: new Date(bucketStart + windowMs + 60 * 60 * 1000),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false },
    ).lean();
    return Boolean(acquired);
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

async function checkRateLimit(input: {
  endpoint: "challenge" | "token";
  deviceId: string;
  request: Request;
  now: Date;
}): Promise<PosAuthRateLimitDecision> {
  const limits = RATE_LIMITS[input.endpoint];
  const deviceAllowed = await acquireRateBucket({
    endpoint: input.endpoint,
    dimension: "device",
    value: input.deviceId,
    limit: limits.deviceMax,
    windowSeconds: limits.windowSeconds,
    now: input.now,
  });
  const ip = clientIp(input.request);
  const ipAllowed = ip
    ? await acquireRateBucket({
        endpoint: input.endpoint,
        dimension: "ip",
        value: ip,
        limit: limits.ipMax,
        windowSeconds: limits.windowSeconds,
        now: input.now,
      })
    : true;
  if (deviceAllowed && ipAllowed) return { allowed: true };
  const elapsed = Math.floor(input.now.getTime() / 1000) % limits.windowSeconds;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, limits.windowSeconds - elapsed),
  };
}

export function createServerPosAuthDependencies(): PosAuthServiceDependencies {
  const environment = requiredEnvironment();
  const tokenConfig = getPosAccessTokenConfigFromEnvironment(true);
  return {
    environment,
    tokenConfig,
    findDevice: (deviceId) => findDevice(deviceId, environment),
    async createChallenge(record) {
      await dbConnect();
      await PosAuthChallenge.create(record);
    },
    async findChallenge(challengeId, deviceId) {
      await dbConnect();
      const value = await PosAuthChallenge.findOne({ challengeId, deviceId })
        .select(
          "challengeId deviceId environment challengeHash createdAt expiresAt consumedAt attemptCount",
        )
        .lean();
      return normalizeChallenge(value);
    },
    async recordChallengeAttempt(input) {
      await dbConnect();
      const value = await PosAuthChallenge.findOneAndUpdate(
        {
          challengeId: input.challengeId,
          deviceId: input.deviceId,
          environment: input.environment,
          consumedAt: null,
          expiresAt: { $gt: input.now },
          attemptCount: { $lt: input.maxAttempts },
        },
        { $inc: { attemptCount: 1 } },
        { new: true },
      )
        .select(
          "challengeId deviceId environment challengeHash createdAt expiresAt consumedAt attemptCount",
        )
        .lean();
      return normalizeChallenge(value);
    },
    async consumeChallenge(input) {
      await dbConnect();
      const consumed = await PosAuthChallenge.findOneAndUpdate(
        {
          challengeId: input.challengeId,
          deviceId: input.deviceId,
          environment: input.environment,
          challengeHash: input.challengeHash,
          consumedAt: null,
          expiresAt: { $gt: input.now },
        },
        { $set: { consumedAt: input.now } },
        { new: true },
      )
        .select("_id")
        .lean();
      return Boolean(consumed);
    },
    checkRateLimit,
  };
}

export const configuredPosCredentialVerifier: PosCredentialVerifier = {
  async verify(token) {
    const config = getPosAccessTokenConfigFromEnvironment(false);
    const verifier = createPosCredentialVerifier({
      config,
      findDevice,
    });
    return verifier.verify(token);
  },
};
