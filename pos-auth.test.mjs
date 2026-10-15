import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { readFileSync } from "node:fs";

import PosAuthChallenge from "./model/PosAuthChallenge.ts";
import PosDevice from "./model/PosDevice.ts";
import {
  POS_ACCESS_TOKEN_LIFETIME_SECONDS,
  POS_CATALOG_READ_SCOPE,
  buildPosChallengeSigningPayload,
  createPosCredentialVerifier,
  hashPosChallenge,
  issuePosAccessToken,
  requirePosDeviceScope,
  verifyPosAccessToken,
} from "./lib/pos/auth.ts";
import {
  POS_CHALLENGE_LIFETIME_SECONDS,
  handlePosChallengeRequest,
  handlePosTokenRequest,
} from "./lib/pos/authService.ts";
import { preparePosDeviceEnrollment } from "./lib/pos/deviceEnrollment.ts";
import { handleCatalogSnapshotRequest } from "./lib/pos/catalogSnapshot.ts";

function pemPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

const DEVICE_A_KEYS = pemPair();
const DEVICE_B_KEYS = pemPair();
const SERVER_KEYS = pemPair();
const OTHER_SERVER_KEYS = pemPair();
const BASE_NOW = new Date("2026-10-15T00:00:00.000Z");
const TOKEN_CONFIG = {
  privateKey: SERVER_KEYS.privateKey,
  publicKey: SERVER_KEYS.publicKey,
  issuer: "kermanatari-pos",
  audience: "kermanatari-api",
  environment: "test",
};

function device(overrides = {}) {
  return {
    deviceId: "device-a",
    credential: {
      publicKey: DEVICE_A_KEYS.publicKey,
      algorithm: "Ed25519",
      keyId: "device-a-key-1",
    },
    status: "active",
    scopes: [POS_CATALOG_READ_SCOPE],
    environment: "test",
    revokedAt: null,
    ...overrides,
  };
}

function cloneChallenge(value) {
  return value
    ? {
        ...value,
        createdAt: new Date(value.createdAt),
        expiresAt: new Date(value.expiresAt),
        consumedAt: value.consumedAt ? new Date(value.consumedAt) : null,
      }
    : null;
}

function memoryDependencies({ devices = [device()], rateLimit } = {}) {
  const deviceMap = new Map(devices.map((item) => [item.deviceId, item]));
  const challenges = new Map();
  const logs = [];
  const nowRef = { value: new Date(BASE_NOW) };
  let idCounter = 0;
  const dependencies = {
    environment: "test",
    tokenConfig: TOKEN_CONFIG,
    now: () => new Date(nowRef.value),
    randomId: () => `challenge-${++idCounter}`,
    findDevice: async (deviceId) => deviceMap.get(deviceId) ?? null,
    createChallenge: async (record) => {
      challenges.set(record.challengeId, cloneChallenge(record));
    },
    findChallenge: async (challengeId, deviceId) => {
      const value = challenges.get(challengeId);
      return value?.deviceId === deviceId ? cloneChallenge(value) : null;
    },
    recordChallengeAttempt: async ({
      challengeId,
      deviceId,
      environment,
      now,
      maxAttempts,
    }) => {
      const value = challenges.get(challengeId);
      if (
        !value ||
        value.deviceId !== deviceId ||
        value.environment !== environment ||
        value.consumedAt !== null ||
        value.expiresAt <= now ||
        value.attemptCount >= maxAttempts
      ) {
        return null;
      }
      value.attemptCount += 1;
      return cloneChallenge(value);
    },
    consumeChallenge: async ({
      challengeId,
      deviceId,
      environment,
      challengeHash,
      now,
    }) => {
      const value = challenges.get(challengeId);
      if (
        !value ||
        value.deviceId !== deviceId ||
        value.environment !== environment ||
        value.challengeHash !== challengeHash ||
        value.consumedAt !== null ||
        value.expiresAt <= now
      ) {
        return false;
      }
      value.consumedAt = new Date(now);
      return true;
    },
    checkRateLimit:
      rateLimit ??
      (async () => ({
        allowed: true,
      })),
    logFailure: (entry) => logs.push(entry),
    logInternalError: (entry) => logs.push(entry),
  };
  return { dependencies, devices: deviceMap, challenges, logs, nowRef };
}

function post(url, body, headers = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function issueChallenge(state, deviceId = "device-a") {
  const response = await handlePosChallengeRequest(
    post("https://example.test/api/pos/v1/auth/challenge", { deviceId }),
    state.dependencies,
  );
  return { response, body: await response.json() };
}

function signatureFor(challengeBody, privateKey = DEVICE_A_KEYS.privateKey) {
  return cryptoSign(
    null,
    buildPosChallengeSigningPayload({
      deviceId: "device-a",
      challengeId: challengeBody.challengeId,
      challenge: challengeBody.challenge,
    }),
    privateKey,
  ).toString("base64url");
}

async function exchangeToken(
  state,
  challengeBody,
  overrides = {},
  privateKey = DEVICE_A_KEYS.privateKey,
) {
  const body = {
    deviceId: "device-a",
    challengeId: challengeBody.challengeId,
    challenge: challengeBody.challenge,
    signature: signatureFor(challengeBody, privateKey),
    ...overrides,
  };
  const response = await handlePosTokenRequest(
    post("https://example.test/api/pos/v1/auth/token", body),
    state.dependencies,
  );
  return { response, body: await response.json() };
}

async function completeFlow(state) {
  const challenge = await issueChallenge(state);
  assert.equal(challenge.response.status, 200);
  return exchangeToken(state, challenge.body);
}

test("unknown device is rejected without revealing its state", async () => {
  const state = memoryDependencies();
  const { response, body } = await issueChallenge(state, "unknown-device");
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTHENTICATION_FAILED");
});

test("disabled device is rejected with the same external response", async () => {
  const state = memoryDependencies({ devices: [device({ status: "disabled" })] });
  const { response, body } = await issueChallenge(state);
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTHENTICATION_FAILED");
});

test("revoked device is rejected with the same external response", async () => {
  const state = memoryDependencies({
    devices: [device({ status: "revoked", revokedAt: new Date(BASE_NOW) })],
  });
  const { response, body } = await issueChallenge(state);
  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTHENTICATION_FAILED");
});

test("active device receives a short-lived versioned challenge", async () => {
  const state = memoryDependencies();
  const { response, body } = await issueChallenge(state);
  assert.equal(response.status, 200);
  assert.equal(body.schemaVersion, 1);
  assert.equal(
    body.expiresAtUtc,
    new Date(BASE_NOW.getTime() + POS_CHALLENGE_LIFETIME_SECONDS * 1000).toISOString(),
  );
});

test("each challenge uses fresh cryptographically random bytes", async () => {
  const state = memoryDependencies();
  const first = await issueChallenge(state);
  const second = await issueChallenge(state);
  assert.notEqual(first.body.challenge, second.body.challenge);
  assert.equal(Buffer.from(first.body.challenge, "base64url").length, 32);
  assert.equal(Buffer.from(second.body.challenge, "base64url").length, 32);
});

test("expired challenge is rejected", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  state.nowRef.value = new Date(
    BASE_NOW.getTime() + (POS_CHALLENGE_LIFETIME_SECONDS + 1) * 1000,
  );
  const token = await exchangeToken(state, challenge.body);
  assert.equal(token.response.status, 401);
});

test("challenge storage contains SHA-256 instead of the raw challenge", async () => {
  const state = memoryDependencies();
  const { body } = await issueChallenge(state);
  const stored = state.challenges.get(body.challengeId);
  assert.equal(stored.challengeHash, hashPosChallenge(body.challenge));
});

test("raw challenge is never persisted", async () => {
  const state = memoryDependencies();
  const { body } = await issueChallenge(state);
  assert.doesNotMatch(
    JSON.stringify(state.challenges.get(body.challengeId)),
    new RegExp(body.challenge),
  );
  assert.equal(PosAuthChallenge.schema.path("challenge"), undefined);
});

test("valid Ed25519 signature is accepted", async () => {
  const state = memoryDependencies();
  const result = await completeFlow(state);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.tokenType, "Bearer");
});

test("invalid signature is rejected", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  const result = await exchangeToken(state, challenge.body, {
    signature: Buffer.alloc(64, 7).toString("base64url"),
  });
  assert.equal(result.response.status, 401);
});

test("signature from another device key is rejected", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  const result = await exchangeToken(
    state,
    challenge.body,
    {},
    DEVICE_B_KEYS.privateKey,
  );
  assert.equal(result.response.status, 401);
});

test("modified challenge is rejected before token issuance", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  const replacement = challenge.body.challenge.startsWith("A") ? "B" : "A";
  const modified = replacement + challenge.body.challenge.slice(1);
  const result = await exchangeToken(state, challenge.body, {
    challenge: modified,
  });
  assert.equal(result.response.status, 401);
});

test("challenge first use succeeds", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  const first = await exchangeToken(state, challenge.body);
  assert.equal(first.response.status, 200);
});

test("challenge second use is rejected", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  assert.equal((await exchangeToken(state, challenge.body)).response.status, 200);
  assert.equal((await exchangeToken(state, challenge.body)).response.status, 401);
});

test("concurrent challenge consumption allows exactly one success", async () => {
  const state = memoryDependencies();
  const challenge = await issueChallenge(state);
  const results = await Promise.all([
    exchangeToken(state, challenge.body),
    exchangeToken(state, challenge.body),
  ]);
  assert.deepEqual(
    results.map((item) => item.response.status).sort(),
    [200, 401],
  );
});

test("valid access token is accepted", async () => {
  const state = memoryDependencies();
  const result = await completeFlow(state);
  const claims = verifyPosAccessToken(result.body.accessToken, TOKEN_CONFIG, BASE_NOW);
  assert.equal(claims.deviceId, "device-a");
  assert.equal(claims.exp - claims.iat, POS_ACCESS_TOKEN_LIFETIME_SECONDS);
});

test("expired access token is rejected", () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const later = new Date(
    BASE_NOW.getTime() + POS_ACCESS_TOKEN_LIFETIME_SECONDS * 1000,
  );
  assert.equal(verifyPosAccessToken(issued.token, TOKEN_CONFIG, later), null);
});

test("wrong token issuer is rejected", () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: { ...TOKEN_CONFIG, issuer: "other-issuer" },
    now: BASE_NOW,
  });
  assert.equal(verifyPosAccessToken(issued.token, TOKEN_CONFIG, BASE_NOW), null);
});

test("wrong token audience is rejected", () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: { ...TOKEN_CONFIG, audience: "other-audience" },
    now: BASE_NOW,
  });
  assert.equal(verifyPosAccessToken(issued.token, TOKEN_CONFIG, BASE_NOW), null);
});

test("wrong token environment is rejected", () => {
  const issued = issuePosAccessToken({
    device: device({ environment: "staging" }),
    config: { ...TOKEN_CONFIG, environment: "staging" },
    now: BASE_NOW,
  });
  assert.equal(verifyPosAccessToken(issued.token, TOKEN_CONFIG, BASE_NOW), null);
});

test("token signed by another server key is rejected", () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: {
      ...TOKEN_CONFIG,
      privateKey: OTHER_SERVER_KEYS.privateKey,
      publicKey: OTHER_SERVER_KEYS.publicKey,
    },
    now: BASE_NOW,
  });
  assert.equal(verifyPosAccessToken(issued.token, TOKEN_CONFIG, BASE_NOW), null);
});

test("tampered access token is rejected", () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const parts = issued.token.split(".");
  const replacement = parts[1].startsWith("A") ? "B" : "A";
  parts[1] = replacement + parts[1].slice(1);
  assert.equal(verifyPosAccessToken(parts.join("."), TOKEN_CONFIG, BASE_NOW), null);
});

test("device revoked after token issuance is rejected immediately", async () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const verifier = createPosCredentialVerifier({
    config: TOKEN_CONFIG,
    now: () => BASE_NOW,
    findDevice: async () =>
      device({ status: "revoked", revokedAt: new Date(BASE_NOW) }),
  });
  assert.equal(await verifier.verify(issued.token), null);
});

test("catalog:read scope is accepted", async () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const verifier = createPosCredentialVerifier({
    config: TOKEN_CONFIG,
    now: () => BASE_NOW,
    findDevice: async () => device(),
  });
  const authorization = await requirePosDeviceScope(
    new Request("https://example.test/api/pos/v1/catalog/snapshot", {
      headers: { Authorization: `Bearer ${issued.token}` },
    }),
    POS_CATALOG_READ_SCOPE,
    verifier,
  );
  assert.equal(authorization.ok, true);
});

test("missing catalog:read scope is rejected with FORBIDDEN", async () => {
  const withoutScope = device({ scopes: ["sync:read"] });
  const issued = issuePosAccessToken({
    device: withoutScope,
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const verifier = createPosCredentialVerifier({
    config: TOKEN_CONFIG,
    now: () => BASE_NOW,
    findDevice: async () => withoutScope,
  });
  const authorization = await requirePosDeviceScope(
    new Request("https://example.test/api/pos/v1/catalog/snapshot", {
      headers: { Authorization: `Bearer ${issued.token}` },
    }),
    POS_CATALOG_READ_SCOPE,
    verifier,
  );
  assert.equal(authorization.ok, false);
  assert.equal(authorization.status, 403);
});

function snapshotProduct() {
  return {
    _id: "64b000000000000000000001",
    title: "محصول نمونه",
    slug: "sample-product",
    sku: "SKU-1",
    status: "draft",
    productType: "single",
    price: 1_200_000,
    discountPrice: null,
    stock: 4,
    category: { _id: "64a000000000000000000001", name: "کنسول" },
    mainImage: "https://example.test/product.jpg",
    catalogRevision: 0,
    inventoryVersion: 0,
    deletedAt: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    variants: [],
  };
}

async function snapshotWithToken(token, currentDevice = device()) {
  const verifier = createPosCredentialVerifier({
    config: TOKEN_CONFIG,
    now: () => BASE_NOW,
    findDevice: async () => currentDevice,
  });
  const response = await handleCatalogSnapshotRequest(
    new Request("https://example.test/api/pos/v1/catalog/snapshot", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    {
      authorize: (request) =>
        requirePosDeviceScope(request, POS_CATALOG_READ_SCOPE, verifier),
      fetchPage: async () => [snapshotProduct()],
      now: () => BASE_NOW,
    },
  );
  return { response, body: await response.json() };
}

test("valid real token can call the catalog snapshot", async () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const result = await snapshotWithToken(issued.token);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.items.length, 1);
});

test("invalid real token receives UNAUTHORIZED from snapshot", async () => {
  const result = await snapshotWithToken("not-a-token");
  assert.equal(result.response.status, 401);
  assert.equal(result.body.error.code, "UNAUTHORIZED");
});

test("valid token with insufficient scope receives FORBIDDEN from snapshot", async () => {
  const withoutScope = device({ scopes: ["sync:read"] });
  const issued = issuePosAccessToken({
    device: withoutScope,
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const result = await snapshotWithToken(issued.token, withoutScope);
  assert.equal(result.response.status, 403);
  assert.equal(result.body.error.code, "FORBIDDEN");
});

test("catalog response contract is unchanged after real auth integration", async () => {
  const issued = issuePosAccessToken({
    device: device(),
    config: TOKEN_CONFIG,
    now: BASE_NOW,
  });
  const { body } = await snapshotWithToken(issued.token);
  assert.deepEqual(body, {
    schemaVersion: 1,
    generatedAtUtc: BASE_NOW.toISOString(),
    consistency: "best-effort",
    invalidItemCount: 0,
    items: [
      {
        productId: "64b000000000000000000001",
        name: "محصول نمونه",
        slug: "sample-product",
        sku: "SKU-1",
        status: "draft",
        productType: "single",
        basePriceToman: 1_200_000,
        discountedPriceToman: null,
        centralStock: 4,
        category: { id: "64a000000000000000000001", name: "کنسول" },
        imageUrl: "https://example.test/product.jpg",
        catalogRevision: 0,
        inventoryVersion: 0,
        siteCreatedAtUtc: "2026-10-01T00:00:00.000Z",
        siteUpdatedAtUtc: "2026-10-02T00:00:00.000Z",
        variants: [],
      },
    ],
    nextPageToken: null,
  });
});

test("snapshot route still contains no MongoDB write operation", () => {
  const source = readFileSync(
    new URL("./app/api/pos/v1/catalog/snapshot/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\.(?:create|save|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|findOneAndDelete)\s*\(|\$(?:inc|set|unset|push|pull)\b/i,
  );
  assert.match(source, /configuredPosCredentialVerifier/);
});

test("MongoDB-backed rate limit rejection returns 429 and Retry-After", async () => {
  const state = memoryDependencies({
    rateLimit: async () => ({ allowed: false, retryAfterSeconds: 42 }),
  });
  const result = await issueChallenge(state);
  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("retry-after"), "42");
  assert.equal(result.body.error.code, "RATE_LIMITED");
});

test("enrollment foundation accepts only public Ed25519 device material", () => {
  const enrollment = preparePosDeviceEnrollment({
    deviceId: "device-a",
    publicKey: DEVICE_A_KEYS.publicKey,
    keyId: "device-a-key-1",
    scopes: [POS_CATALOG_READ_SCOPE],
    environment: "test",
  });
  assert.equal(enrollment.credential.algorithm, "Ed25519");
  assert.equal("privateKey" in enrollment.credential, false);
});

test("PosDevice supports disabled state without treating it as revoked", async () => {
  const disabled = new PosDevice({
    ...preparePosDeviceEnrollment({
      deviceId: "device-disabled",
      publicKey: DEVICE_A_KEYS.publicKey,
      keyId: "device-disabled-key",
      scopes: [POS_CATALOG_READ_SCOPE],
      environment: "test",
    }),
    status: "disabled",
  });
  await disabled.validate();
});
