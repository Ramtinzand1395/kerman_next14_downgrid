import { randomBytes, randomUUID } from "node:crypto";

import {
  POS_ACCESS_TOKEN_LIFETIME_SECONDS,
  POS_CHALLENGE_BYTES,
  PosAuthConfigurationError,
  type PosAccessTokenConfig,
  type PosDeviceAuthRecord,
  type PosEnvironment,
  hashPosChallenge,
  issuePosAccessToken,
  posChallengeHashesEqual,
  verifyPosChallengeSignature,
} from "./auth.ts";

export const POS_CHALLENGE_LIFETIME_SECONDS = 120;
export const POS_CHALLENGE_MAX_ATTEMPTS = 5;

const DEVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_AUTH_BODY_BYTES = 16 * 1024;

export type PosAuthChallengeRecord = {
  challengeId: string;
  deviceId: string;
  environment: PosEnvironment;
  challengeHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
};

export type PosAuthRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type PosAuthServiceDependencies = {
  environment: PosEnvironment;
  tokenConfig: PosAccessTokenConfig;
  findDevice(deviceId: string): Promise<PosDeviceAuthRecord | null>;
  createChallenge(record: PosAuthChallengeRecord): Promise<void>;
  findChallenge(
    challengeId: string,
    deviceId: string,
  ): Promise<PosAuthChallengeRecord | null>;
  recordChallengeAttempt(input: {
    challengeId: string;
    deviceId: string;
    environment: PosEnvironment;
    now: Date;
    maxAttempts: number;
  }): Promise<PosAuthChallengeRecord | null>;
  consumeChallenge(input: {
    challengeId: string;
    deviceId: string;
    environment: PosEnvironment;
    challengeHash: string;
    now: Date;
  }): Promise<boolean>;
  checkRateLimit(input: {
    endpoint: "challenge" | "token";
    deviceId: string;
    request: Request;
    now: Date;
  }): Promise<PosAuthRateLimitDecision>;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
  randomId?: () => string;
  logFailure?: (entry: {
    event: "pos.auth.failed";
    deviceId: string;
    reasonCode: string;
  }) => void;
  logInternalError?: (entry: {
    event: "pos.auth.internal_error";
    errorType: string;
  }) => void;
};

function jsonResponse(
  payload: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Response {
  return jsonResponse({ error: { code, message } }, status, headers);
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_AUTH_BODY_BYTES
  ) {
    throw new Error("BODY_TOO_LARGE");
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_AUTH_BODY_BYTES) {
    throw new Error("BODY_TOO_LARGE");
  }
  const value = JSON.parse(body) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_BODY");
  }
  return value as Record<string, unknown>;
}

function validDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER_PATTERN.test(value);
}

function validBase64Url(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    BASE64URL_PATTERN.test(value)
  );
}

function logFailure(
  dependencies: PosAuthServiceDependencies,
  deviceId: string,
  reasonCode: string,
) {
  const entry = {
    event: "pos.auth.failed" as const,
    deviceId,
    reasonCode,
  };
  if (dependencies.logFailure) dependencies.logFailure(entry);
  else console.warn(JSON.stringify(entry));
}

function authenticationFailed(): Response {
  return errorResponse(
    401,
    "AUTHENTICATION_FAILED",
    "POS device authentication failed.",
  );
}

async function applyRateLimit(
  request: Request,
  endpoint: "challenge" | "token",
  deviceId: string,
  now: Date,
  dependencies: PosAuthServiceDependencies,
): Promise<Response | null> {
  const decision = await dependencies.checkRateLimit({
    endpoint,
    deviceId,
    request,
    now,
  });
  if (decision.allowed) return null;
  logFailure(dependencies, deviceId, "RATE_LIMITED");
  return errorResponse(
    429,
    "RATE_LIMITED",
    "Too many POS authentication requests.",
    { "Retry-After": String(decision.retryAfterSeconds) },
  );
}

function activeEd25519Device(
  device: PosDeviceAuthRecord | null,
  environment: PosEnvironment,
): device is PosDeviceAuthRecord {
  return Boolean(
    device &&
      device.status === "active" &&
      device.revokedAt === null &&
      device.environment === environment &&
      device.credential.algorithm === "Ed25519",
  );
}

function internalErrorResponse(
  error: unknown,
  dependencies: PosAuthServiceDependencies,
): Response {
  const entry = {
    event: "pos.auth.internal_error" as const,
    errorType: error instanceof Error ? error.name : "UnknownError",
  };
  if (dependencies.logInternalError) dependencies.logInternalError(entry);
  else console.error(JSON.stringify(entry));
  return errorResponse(
    error instanceof PosAuthConfigurationError ? 503 : 500,
    error instanceof PosAuthConfigurationError
      ? "AUTH_UNAVAILABLE"
      : "INTERNAL_ERROR",
    "POS authentication is temporarily unavailable.",
  );
}

export async function handlePosChallengeRequest(
  request: Request,
  dependencies: PosAuthServiceDependencies,
): Promise<Response> {
  let deviceId = "unknown";
  try {
    const body = await readJsonObject(request);
    if (Object.keys(body).length !== 1 || !validDeviceId(body.deviceId)) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
    }
    deviceId = body.deviceId;
    const now = (dependencies.now ?? (() => new Date()))();
    const limited = await applyRateLimit(
      request,
      "challenge",
      deviceId,
      now,
      dependencies,
    );
    if (limited) return limited;

    const device = await dependencies.findDevice(deviceId);
    if (!activeEd25519Device(device, dependencies.environment)) {
      logFailure(dependencies, deviceId, "DEVICE_NOT_ELIGIBLE");
      return authenticationFailed();
    }

    const challenge = (dependencies.randomBytes ?? randomBytes)(
      POS_CHALLENGE_BYTES,
    ).toString("base64url");
    const challengeId = (dependencies.randomId ?? randomUUID)();
    const expiresAt = new Date(
      now.getTime() + POS_CHALLENGE_LIFETIME_SECONDS * 1000,
    );
    await dependencies.createChallenge({
      challengeId,
      deviceId,
      environment: dependencies.environment,
      challengeHash: hashPosChallenge(challenge),
      createdAt: now,
      expiresAt,
      consumedAt: null,
      attemptCount: 0,
    });

    return jsonResponse({
      schemaVersion: 1,
      challengeId,
      challenge,
      expiresAtUtc: expiresAt.toISOString(),
    });
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        (error.message === "INVALID_BODY" || error.message === "BODY_TOO_LARGE"))
    ) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
    }
    return internalErrorResponse(error, dependencies);
  }
}

export async function handlePosTokenRequest(
  request: Request,
  dependencies: PosAuthServiceDependencies,
): Promise<Response> {
  let deviceId = "unknown";
  try {
    const body = await readJsonObject(request);
    if (
      Object.keys(body).length !== 4 ||
      !validDeviceId(body.deviceId) ||
      !validIdentifier(body.challengeId) ||
      !validBase64Url(body.challenge, 128) ||
      !validBase64Url(body.signature, 256)
    ) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
    }
    deviceId = body.deviceId;
    const challengeId = body.challengeId;
    const challenge = body.challenge;
    const signature = body.signature;
    const now = (dependencies.now ?? (() => new Date()))();
    const limited = await applyRateLimit(
      request,
      "token",
      deviceId,
      now,
      dependencies,
    );
    if (limited) return limited;

    const existing = await dependencies.findChallenge(challengeId, deviceId);
    if (
      !existing ||
      existing.environment !== dependencies.environment ||
      existing.consumedAt !== null ||
      existing.expiresAt.getTime() <= now.getTime()
    ) {
      logFailure(dependencies, deviceId, "CHALLENGE_UNAVAILABLE");
      return authenticationFailed();
    }

    const attempted = await dependencies.recordChallengeAttempt({
      challengeId,
      deviceId,
      environment: dependencies.environment,
      now,
      maxAttempts: POS_CHALLENGE_MAX_ATTEMPTS,
    });
    if (!attempted) {
      logFailure(dependencies, deviceId, "CHALLENGE_UNAVAILABLE");
      return authenticationFailed();
    }

    let suppliedHash: string;
    try {
      suppliedHash = hashPosChallenge(challenge);
    } catch {
      logFailure(dependencies, deviceId, "CHALLENGE_MISMATCH");
      return authenticationFailed();
    }
    if (!posChallengeHashesEqual(attempted.challengeHash, suppliedHash)) {
      logFailure(dependencies, deviceId, "CHALLENGE_MISMATCH");
      return authenticationFailed();
    }

    const device = await dependencies.findDevice(deviceId);
    if (!activeEd25519Device(device, dependencies.environment)) {
      logFailure(dependencies, deviceId, "DEVICE_NOT_ELIGIBLE");
      return authenticationFailed();
    }
    if (
      !verifyPosChallengeSignature({
        deviceId,
        challengeId,
        challenge,
        signature,
        publicKey: device.credential.publicKey,
        algorithm: device.credential.algorithm,
      })
    ) {
      logFailure(dependencies, deviceId, "INVALID_SIGNATURE");
      return authenticationFailed();
    }

    const issued = issuePosAccessToken({
      device,
      config: dependencies.tokenConfig,
      now,
    });
    const consumed = await dependencies.consumeChallenge({
      challengeId,
      deviceId,
      environment: dependencies.environment,
      challengeHash: suppliedHash,
      now,
    });
    if (!consumed) {
      logFailure(dependencies, deviceId, "CHALLENGE_REPLAY");
      return authenticationFailed();
    }

    return jsonResponse({
      schemaVersion: 1,
      tokenType: "Bearer",
      accessToken: issued.token,
      expiresInSeconds: POS_ACCESS_TOKEN_LIFETIME_SECONDS,
      expiresAtUtc: new Date(issued.claims.exp * 1000).toISOString(),
    });
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        (error.message === "INVALID_BODY" || error.message === "BODY_TOO_LARGE"))
    ) {
      return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
    }
    return internalErrorResponse(error, dependencies);
  }
}
