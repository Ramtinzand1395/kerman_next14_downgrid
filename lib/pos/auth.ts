import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign as cryptoSign,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";

export const POS_CATALOG_READ_SCOPE = "catalog:read" as const;
export const POS_ACCESS_TOKEN_LIFETIME_SECONDS = 5 * 60;
export const POS_CHALLENGE_BYTES = 32;
export const POS_CHALLENGE_SIGNING_CONTEXT = "KERMANATARI-POS-AUTH-V1";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const CLOCK_SKEW_SECONDS = 30;

export type PosEnvironment = "test" | "staging" | "production";

export type PosDevicePrincipal = {
  deviceId: string;
  scopes: readonly string[];
  keyId?: string;
  environment?: PosEnvironment;
};

export type PosAuthorizationResult =
  | {
      ok: true;
      principal: PosDevicePrincipal;
    }
  | {
      ok: false;
      status: 401 | 403;
      code: "UNAUTHORIZED" | "FORBIDDEN";
      message: string;
    };

export type PosCredentialVerifier = {
  verify(token: string): Promise<PosDevicePrincipal | null>;
};

export type PosAccessTokenConfig = {
  privateKey?: string;
  publicKey: string;
  issuer: string;
  audience: string;
  environment: PosEnvironment;
};

export type PosAccessTokenClaims = {
  iss: string;
  aud: string;
  sub: string;
  deviceId: string;
  keyId: string;
  environment: PosEnvironment;
  scopes: string[];
  iat: number;
  exp: number;
  jti: string;
};

export type PosDeviceAuthRecord = {
  deviceId: string;
  credential: {
    publicKey: string;
    algorithm: string;
    keyId: string;
  };
  status: string;
  scopes: readonly string[];
  environment: PosEnvironment;
  revokedAt: Date | null;
};

export class PosAuthConfigurationError extends Error {
  constructor(message = "POS authentication is not configured.") {
    super(message);
    this.name = "PosAuthConfigurationError";
  }
}

function isPosEnvironment(value: unknown): value is PosEnvironment {
  return value === "test" || value === "staging" || value === "production";
}

function decodeCanonicalBase64Url(value: string, maxLength: number): Buffer {
  if (
    value.length === 0 ||
    value.length > maxLength ||
    !BASE64URL_PATTERN.test(value)
  ) {
    throw new Error("Invalid base64url value");
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error("Non-canonical base64url value");
  }
  return decoded;
}

function parseJsonObject(segment: string): Record<string, unknown> {
  const decoded = decodeCanonicalBase64Url(segment, 4096);
  const value = JSON.parse(decoded.toString("utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid JSON object");
  }
  return value as Record<string, unknown>;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function assertEd25519PublicKey(publicKey: string) {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("Expected an Ed25519 public key");
  }
  return key;
}

function assertEd25519PrivateKey(privateKey: string) {
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("Expected an Ed25519 private key");
  }
  return key;
}

function assertTokenConfig(
  config: PosAccessTokenConfig,
  requirePrivateKey: boolean,
) {
  if (
    !config.issuer.trim() ||
    !config.audience.trim() ||
    !isPosEnvironment(config.environment) ||
    !config.publicKey.trim()
  ) {
    throw new PosAuthConfigurationError();
  }

  try {
    const publicKey = assertEd25519PublicKey(config.publicKey);
    if (!requirePrivateKey) return { publicKey, privateKey: null };
    if (!config.privateKey?.trim()) throw new Error("Missing private key");
    const privateKey = assertEd25519PrivateKey(config.privateKey);
    const probe = Buffer.from("kermanatari-pos-key-pair-check", "utf8");
    const signature = cryptoSign(null, probe, privateKey);
    if (!cryptoVerify(null, probe, publicKey, signature)) {
      throw new Error("Signing key pair mismatch");
    }
    return { publicKey, privateKey };
  } catch {
    throw new PosAuthConfigurationError();
  }
}

export function normalizePosPem(value: string | undefined): string {
  return (value ?? "").replace(/\\n/g, "\n").trim();
}

export function hashPosChallenge(challenge: string): string {
  const bytes = decodeCanonicalBase64Url(challenge, 128);
  if (bytes.length !== POS_CHALLENGE_BYTES) {
    throw new Error("Invalid POS challenge length");
  }
  return createHash("sha256").update(bytes).digest("hex");
}

export function posChallengeHashesEqual(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function buildPosChallengeSigningPayload(input: {
  deviceId: string;
  challengeId: string;
  challenge: string;
}): Buffer {
  if (
    !DEVICE_ID_PATTERN.test(input.deviceId) ||
    !IDENTIFIER_PATTERN.test(input.challengeId)
  ) {
    throw new Error("Invalid POS challenge identity");
  }
  hashPosChallenge(input.challenge);
  return Buffer.from(
    `${POS_CHALLENGE_SIGNING_CONTEXT}\n${input.deviceId}\n${input.challengeId}\n${input.challenge}`,
    "utf8",
  );
}

export function verifyPosChallengeSignature(input: {
  deviceId: string;
  challengeId: string;
  challenge: string;
  signature: string;
  publicKey: string;
  algorithm: string;
}): boolean {
  if (input.algorithm !== "Ed25519") return false;
  try {
    const signature = decodeCanonicalBase64Url(input.signature, 256);
    if (signature.length !== 64) return false;
    return cryptoVerify(
      null,
      buildPosChallengeSigningPayload(input),
      assertEd25519PublicKey(input.publicKey),
      signature,
    );
  } catch {
    return false;
  }
}

export function issuePosAccessToken(input: {
  device: PosDeviceAuthRecord;
  config: PosAccessTokenConfig;
  now?: Date;
  jti?: string;
}): { token: string; claims: PosAccessTokenClaims } {
  const keys = assertTokenConfig(input.config, true);
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const claims: PosAccessTokenClaims = {
    iss: input.config.issuer,
    aud: input.config.audience,
    sub: input.device.deviceId,
    deviceId: input.device.deviceId,
    keyId: input.device.credential.keyId,
    environment: input.config.environment,
    scopes: [...input.device.scopes],
    iat: issuedAt,
    exp: issuedAt + POS_ACCESS_TOKEN_LIFETIME_SECONDS,
    jti: input.jti ?? randomUUID(),
  };
  const encodedHeader = encodeJson({ alg: "EdDSA", typ: "JWT" });
  const encodedPayload = encodeJson(claims);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = cryptoSign(
    null,
    Buffer.from(signingInput, "ascii"),
    keys.privateKey!,
  ).toString("base64url");
  return { token: `${signingInput}.${signature}`, claims };
}

export function verifyPosAccessToken(
  token: string,
  config: PosAccessTokenConfig,
  now = new Date(),
): PosAccessTokenClaims | null {
  const keys = assertTokenConfig(config, false);
  try {
    if (token.length === 0 || token.length > 4096) return null;
    const segments = token.split(".");
    if (segments.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    const header = parseJsonObject(encodedHeader);
    if (
      Object.keys(header).length !== 2 ||
      header.alg !== "EdDSA" ||
      header.typ !== "JWT"
    ) {
      return null;
    }
    const signature = decodeCanonicalBase64Url(encodedSignature, 256);
    if (
      signature.length !== 64 ||
      !cryptoVerify(
        null,
        Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii"),
        keys.publicKey,
        signature,
      )
    ) {
      return null;
    }

    const raw = parseJsonObject(encodedPayload);
    if (
      raw.iss !== config.issuer ||
      raw.aud !== config.audience ||
      raw.environment !== config.environment ||
      typeof raw.sub !== "string" ||
      raw.sub !== raw.deviceId ||
      typeof raw.deviceId !== "string" ||
      !DEVICE_ID_PATTERN.test(raw.deviceId) ||
      typeof raw.keyId !== "string" ||
      !IDENTIFIER_PATTERN.test(raw.keyId) ||
      typeof raw.jti !== "string" ||
      !IDENTIFIER_PATTERN.test(raw.jti) ||
      !Array.isArray(raw.scopes) ||
      raw.scopes.length === 0 ||
      raw.scopes.length > 16 ||
      !raw.scopes.every(
        (scope) => typeof scope === "string" && IDENTIFIER_PATTERN.test(scope),
      ) ||
      new Set(raw.scopes).size !== raw.scopes.length ||
      !Number.isSafeInteger(raw.iat) ||
      !Number.isSafeInteger(raw.exp)
    ) {
      return null;
    }

    const nowSeconds = Math.floor(now.getTime() / 1000);
    const issuedAt = raw.iat as number;
    const expiresAt = raw.exp as number;
    if (
      issuedAt > nowSeconds + CLOCK_SKEW_SECONDS ||
      expiresAt <= nowSeconds ||
      expiresAt <= issuedAt ||
      expiresAt - issuedAt > POS_ACCESS_TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }

    return raw as PosAccessTokenClaims;
  } catch {
    return null;
  }
}

export function createPosCredentialVerifier(input: {
  config: PosAccessTokenConfig;
  findDevice(
    deviceId: string,
    environment: PosEnvironment,
  ): Promise<PosDeviceAuthRecord | null>;
  now?: () => Date;
}): PosCredentialVerifier {
  return {
    async verify(token) {
      const claims = verifyPosAccessToken(
        token,
        input.config,
        (input.now ?? (() => new Date()))(),
      );
      if (!claims) return null;

      const device = await input.findDevice(claims.deviceId, claims.environment);
      if (
        !device ||
        device.status !== "active" ||
        device.revokedAt !== null ||
        device.environment !== claims.environment ||
        device.credential.algorithm !== "Ed25519" ||
        device.credential.keyId !== claims.keyId
      ) {
        return null;
      }

      const currentScopes = new Set(device.scopes);
      return {
        deviceId: claims.deviceId,
        keyId: claims.keyId,
        environment: claims.environment,
        scopes: claims.scopes.filter((scope) => currentScopes.has(scope)),
      };
    },
  };
}

const unconfiguredPosCredentialVerifier: PosCredentialVerifier = {
  async verify() {
    return null;
  },
};

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match || match[1].length > 4096) return null;
  return match[1];
}

export async function requirePosDeviceScope(
  request: Request,
  requiredScope: string,
  verifier: PosCredentialVerifier = unconfiguredPosCredentialVerifier,
): Promise<PosAuthorizationResult> {
  const token = readBearerToken(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Valid POS credentials are required.",
    };
  }

  let principal: PosDevicePrincipal | null = null;
  try {
    principal = await verifier.verify(token);
  } catch {
    // Credentials, signatures, keys and tokens must never be logged here.
    principal = null;
  }

  if (!principal || !principal.deviceId) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Valid POS credentials are required.",
    };
  }

  if (!principal.scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "The POS credential does not have the required scope.",
    };
  }

  return { ok: true, principal };
}
