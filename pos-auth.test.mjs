import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticatePosRequestCore,
  posAuthResponse,
} from "./lib/pos/auth-core.ts";
import { serializePosDevice } from "./lib/pos/device.ts";
import { generatePosToken, hashPosToken } from "./lib/pos/token.ts";

const pepper = "test-only-pos-pepper-that-is-not-a-production-secret";

function createHarness({ scopes = ["catalog"], isActive = true } = {}) {
  const token = generatePosToken();
  const tokenHash = hashPosToken(token, pepper);
  const device = {
    deviceId: "pos_11111111-1111-4111-8111-111111111111",
    name: "POS Test",
    scopes,
    isActive,
    tokenVersion: 1,
  };
  const touched = [];
  const dependencies = {
    hashToken: (value) => hashPosToken(value, pepper),
    findDevice: async (deviceId, suppliedHash) =>
      deviceId === device.deviceId && suppliedHash === tokenHash ? device : null,
    consumeRequestLimit: async () => ({ allowed: true }),
    consumeFailureLimit: async () => ({ allowed: true }),
    touchDevice: async (deviceId) => touched.push(deviceId),
  };
  return { token, tokenHash, device, dependencies, touched };
}

function requestFor(deviceId, token) {
  const headers = new Headers();
  if (deviceId) headers.set("x-pos-device-id", deviceId);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("https://example.test/api/pos/v1", { headers });
}

test("POS auth returns 401 when the token is missing", async () => {
  const harness = createHarness();
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 401);
  assert.equal(result.ok, false);
});

test("POS auth returns 401 for an incorrect token", async () => {
  const harness = createHarness();
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId, generatePosToken()),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 401);
});

test("POS auth returns 403 when the required scope is missing", async () => {
  const harness = createHarness({ scopes: ["orders"] });
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId, harness.token),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 403);
});

test("POS auth succeeds with a valid token and scope", async () => {
  const harness = createHarness();
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId, harness.token),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 200);
  assert.equal(result.ok, true);
  assert.deepEqual(harness.touched, [harness.device.deviceId]);
});

test("POS auth rejects a disabled device", async () => {
  const harness = createHarness({ isActive: false });
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId, harness.token),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 401);
});

test("POS auth returns 429 when the request rate limit is exceeded", async () => {
  const harness = createHarness();
  harness.dependencies.consumeRequestLimit = async () => ({
    allowed: false,
    retryAfterSeconds: 30,
  });
  const result = await authenticatePosRequestCore(
    requestFor(harness.device.deviceId, harness.token),
    ["catalog"],
    harness.dependencies,
  );
  assert.equal(result.status, 429);
  const response = posAuthResponse(result);
  assert.equal(response.headers.get("retry-after"), "30");
});

test("raw tokens and token hashes are absent from auth responses and logs", async () => {
  const harness = createHarness();
  const captured = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...values) => captured.push(values.join(" "));
  console.log = (...values) => captured.push(values.join(" "));

  try {
    const result = await authenticatePosRequestCore(
      requestFor(harness.device.deviceId, harness.token),
      ["catalog"],
      harness.dependencies,
    );
    const response = posAuthResponse(result);
    const responseText = await response.text();
    const serialized = JSON.stringify(
      serializePosDevice({
        ...harness.device,
        token: harness.token,
        tokenHash: harness.tokenHash,
      }),
    );

    assert.equal(responseText.includes(harness.token), false);
    assert.equal(responseText.includes(harness.tokenHash), false);
    assert.equal(serialized.includes(harness.token), false);
    assert.equal(serialized.includes(harness.tokenHash), false);
    assert.equal(captured.join("\n").includes(harness.token), false);
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});
