import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const jobId = "a".repeat(24);
const validToken = `kprinter_v1_${"b".repeat(43)}`;
const validPayload = {
  receiptType: "PS5",
  fullName: "Test Customer",
  mobile: "09123456789",
  date: "1405/08/16",
  games: [{ name: "Game", sizeGB: 10, price: 100, storage: 1 }],
  price: 100,
  totalSizeGB: 10,
  customerDescription: "",
};

function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  new Function("require", "module", "exports", code)(
    (name) => (Object.hasOwn(deps, name) ? deps[name] : require(name)),
    module,
    module.exports,
  );
  return module.exports;
}

const requestHelpers = load("./lib/device-auth/request.ts");
const printerConstants = load("./lib/printer/constants.ts");
const printerToken = load("./lib/printer/token.ts", {
  "./constants.ts": printerConstants,
});
const authCore = load("./lib/printer/auth-core.ts", {
  "../device-auth/request.ts": requestHelpers,
  "./constants.ts": printerConstants,
  "./token.ts": printerToken,
});
const payloadParser = load("./lib/print/payload.ts");
const queueCore = load("./lib/print/queue-core.ts");

const activeDevice = {
  deviceId: "printer_123e4567-e89b-42d3-a456-426614174000",
  name: "Staging printer",
  scopes: ["queue:read", "queue:ack"],
  isActive: true,
  tokenVersion: 1,
};

function authDependencies(overrides = {}) {
  return {
    authMode: () => "required",
    hashToken: () => "hashed-token",
    findDevice: async () => activeDevice,
    consumeRequestLimit: async () => ({ allowed: true }),
    consumeFailureLimit: async () => ({ allowed: true }),
    touchDevice: async () => {},
    ...overrides,
  };
}

test("printer auth rejects absent, invalid, and revoked tokens", async () => {
  for (const [request, deps] of [
    [new Request("https://example.test/print"), authDependencies()],
    [
      new Request("https://example.test/print", {
        headers: { authorization: "Bearer invalid" },
      }),
      authDependencies(),
    ],
    [
      new Request("https://example.test/print", {
        headers: { authorization: `Bearer ${validToken}` },
      }),
      authDependencies({ findDevice: async () => null }),
    ],
  ]) {
    const result = await authCore.authenticatePrinterRequestCore(
      request,
      ["queue:read"],
      deps,
    );
    assert.equal(result.status, 401);
    assert.equal(result.code, "PRINTER_UNAUTHORIZED");
  }
});

test("valid printer token succeeds and missing scope is forbidden", async () => {
  const request = new Request("https://example.test/print", {
    headers: { authorization: `Bearer ${validToken}` },
  });
  const success = await authCore.authenticatePrinterRequestCore(
    request,
    ["queue:read"],
    authDependencies(),
  );
  assert.equal(success.ok, true);
  assert.equal(success.device.deviceId, activeDevice.deviceId);

  const forbidden = await authCore.authenticatePrinterRequestCore(
    request,
    ["queue:ack"],
    authDependencies({
      findDevice: async () => ({ ...activeDevice, scopes: ["queue:read"] }),
    }),
  );
  assert.equal(forbidden.status, 403);
});

test("printer request rate limit and explicit auth mode are enforced", async () => {
  const limited = await authCore.authenticatePrinterRequestCore(
    new Request("https://example.test/print"),
    ["queue:read"],
    authDependencies({
      consumeRequestLimit: async () => ({ allowed: false, retryAfterSeconds: 9 }),
    }),
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfterSeconds, 9);

  const unconfigured = await authCore.authenticatePrinterRequestCore(
    new Request("https://example.test/print"),
    ["queue:read"],
    authDependencies({ authMode: () => null }),
  );
  assert.equal(unconfigured.status, 503);

  const compatibility = await authCore.authenticatePrinterRequestCore(
    new Request("https://example.test/print"),
    ["queue:read"],
    authDependencies({ authMode: () => "compatibility" }),
  );
  assert.equal(compatibility.ok, true);
  assert.equal(compatibility.compatibilityMode, true);
});

test("print payload parser validates schema and byte limit", async () => {
  const valid = await payloadParser.parsePrintPayloadRequest(
    new Request("https://example.test/print", {
      method: "POST",
      body: JSON.stringify(validPayload),
    }),
  );
  assert.equal(valid.ok, true);

  const invalid = await payloadParser.parsePrintPayloadRequest(
    new Request("https://example.test/print", {
      method: "POST",
      body: JSON.stringify({ ...validPayload, games: "not-an-array" }),
    }),
  );
  assert.equal(invalid.status, 400);

  const tooLarge = await payloadParser.parsePrintPayloadRequest(
    new Request("https://example.test/print", {
      method: "POST",
      headers: { "content-length": String(65 * 1024) },
      body: "{}",
    }),
  );
  assert.equal(tooLarge.status, 413);
});

function printRouteHarness(session, authResult, jobs = []) {
  let created = 0;
  const route = load("./app/api/admin/store-order/print/route.ts", {
    "next-auth": { getServerSession: async () => session },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/print/payload": payloadParser,
    "@/lib/print/queue": {
      createPrintJob: async () => { created++; },
      listPrintJobsForConsumer: async () => jobs,
    },
    "@/lib/printer/auth": {
      authenticatePrinterRequest: async () => authResult,
      printerConsumerId: (id) => `printer:${id}`,
    },
    "@/lib/printer/auth-core": authCore,
  });
  return { route, get created() { return created; } };
}

test("POST requires an admin session before creating a print job", async () => {
  for (const [session, status, expectedCreates] of [
    [null, 401, 0],
    [{ user: { id: "u1", role: "user" } }, 403, 0],
    [{ user: { id: "a1", role: "admin" } }, 200, 1],
    [{ user: { id: "s1", role: "superadmin" } }, 200, 1],
  ]) {
    const harness = printRouteHarness(session, { ok: false, status: 401 });
    const response = await harness.route.POST(
      new Request("https://example.test/print", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );
    assert.equal(response.status, status);
    assert.equal(harness.created, expectedCreates);
  }
});

test("GET keeps the Stage1 response contract and no-store policy", async () => {
  const unauthorized = printRouteHarness(null, {
    ok: false,
    status: 401,
    code: "PRINTER_UNAUTHORIZED",
  });
  assert.equal(
    (await unauthorized.route.GET(new Request("https://example.test/print"))).status,
    401,
  );

  const jobs = [{ _id: jobId, payload: validPayload }];
  const authorized = printRouteHarness(null, {
    ok: true,
    device: activeDevice,
    compatibilityMode: false,
  }, jobs);
  const response = await authorized.route.GET(
    new Request("https://example.test/print", {
      headers: { authorization: `Bearer ${validToken}` },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    success: true,
    jobExists: true,
    payload: jobs,
  });
});

function ackRouteHarness(authResult, ackResult) {
  return load("./app/api/admin/store-order/print/printed/[jobId]/route.ts", {
    "@/lib/print/queue": { acknowledgePrintJob: async () => ackResult },
    "@/lib/printer/auth": {
      authenticatePrinterRequest: async () => authResult,
      printerConsumerId: (id) => `printer:${id}`,
    },
    "@/lib/printer/auth-core": authCore,
  });
}

test("DELETE requires auth, validates id, and returns idempotent success", async () => {
  const unauthorized = ackRouteHarness(
    { ok: false, status: 401, code: "PRINTER_UNAUTHORIZED" },
    null,
  );
  assert.equal(
    (await unauthorized.DELETE(new Request("https://example.test"), {
      params: { jobId },
    })).status,
    401,
  );

  const authResult = { ok: true, device: activeDevice, compatibilityMode: false };
  const invalid = ackRouteHarness(authResult, null);
  assert.equal(
    (await invalid.DELETE(new Request("https://example.test"), {
      params: { jobId: "bad" },
    })).status,
    400,
  );

  for (const alreadyProcessed of [false, true]) {
    const route = ackRouteHarness(authResult, {
      state: "completed",
      alreadyProcessed,
    });
    const response = await route.DELETE(new Request("https://example.test"), {
      params: { jobId },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      message: "Print job removed successfully",
    });
  }
});

test("ACK retry never deletes a job and another consumer cannot ACK it", async () => {
  const job = { owner: "printer:one", status: "pending" };
  const repository = {
    async completePending(_id, consumerId) {
      if (job.owner !== consumerId || job.status !== "pending") return null;
      job.status = "completed";
      return { status: job.status };
    },
    async findOwned(_id, consumerId) {
      return job.owner === consumerId ? { status: job.status } : null;
    },
  };

  const first = await queueCore.acknowledgePrintJobCore(jobId, "printer:one", repository);
  const retry = await queueCore.acknowledgePrintJobCore(jobId, "printer:one", repository);
  const other = await queueCore.acknowledgePrintJobCore(jobId, "printer:two", repository);
  assert.deepEqual(first, { state: "completed", alreadyProcessed: false });
  assert.deepEqual(retry, { state: "completed", alreadyProcessed: true });
  assert.deepEqual(other, { state: "not-found", alreadyProcessed: false });
  assert.equal(job.status, "completed");
});
