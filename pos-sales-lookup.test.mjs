import test from "node:test";
import assert from "node:assert/strict";
import { handlePosSaleLookupRequest } from "./lib/pos/sales-lookup-core.ts";

const request = new Request("https://kermanatari.ir/api/pos/v1/sales/invoice-1");
const device = (deviceId) => ({
  ok: true, status: 200,
  device: { deviceId, name: "Counter", scopes: ["catalog", "sales"], isActive: true, tokenVersion: 1 },
});
const receipt = {
  saleId: "invoice-1", siteSaleId: "67f123456789abcdef123450",
  invoiceNumber: "POS-67F123456789ABCDEF123450",
  soldAtUtc: "2026-11-04T09:00:00.000Z",
  syncedAtUtc: "2026-11-04T09:00:01.000Z",
  finalAmountToman: 150000, syncStatus: "synced", reviewReasons: [],
};

test("sale lookup requires authenticated sales device and never queries without auth", async () => {
  let queried = false;
  const response = await handlePosSaleLookupRequest(request, "invoice-1", {
    authenticate: async () => ({ ok: false, status: 403, code: "POS_SCOPE_FORBIDDEN" }),
    findSale: async () => { queried = true; return receipt; },
  });
  assert.equal(response.status, 403);
  assert.equal(queried, false);
  assert.equal((await response.json()).error.code, "POS_SCOPE_FORBIDDEN");
});

test("saleId is strictly validated before lookup", async () => {
  let queried = false;
  const response = await handlePosSaleLookupRequest(request, "../invoice-1", {
    authenticate: async () => device("counter-1"),
    findSale: async () => { queried = true; return receipt; },
  });
  assert.equal(response.status, 400);
  assert.equal(queried, false);
});

test("receipt belongs only to the authenticated device; never cross-device", async () => {
  const rows = new Map([["counter-1:invoice-1", receipt]]);
  const findSale = async (deviceId, saleId) => rows.get(`${deviceId}:${saleId}`) ?? null;
  const a = await handlePosSaleLookupRequest(request, "invoice-1", {
    authenticate: async () => device("counter-1"), findSale,
  });
  assert.equal(a.status, 200);
  assert.deepEqual((await a.json()).sale, receipt);
  assert.match(a.headers.get("cache-control"), /no-store/);
  const b = await handlePosSaleLookupRequest(request, "invoice-1", {
    authenticate: async () => device("counter-2"), findSale,
  });
  assert.equal(b.status, 404);
  assert.equal((await b.json()).error.code, "POS_SALE_NOT_FOUND");
});

test("unknown sale returns 404; failed lookup returns safe 503", async () => {
  const auth = async () => device("counter-1");
  const missing = await handlePosSaleLookupRequest(request, "invoice-1", {
    authenticate: auth, findSale: async () => null,
  });
  assert.equal(missing.status, 404);
  const original = console.error;
  console.error = () => {};
  try {
    const failed = await handlePosSaleLookupRequest(request, "invoice-1", {
      authenticate: auth, findSale: async () => { throw new Error("private-token"); },
    });
    assert.equal(failed.status, 503);
    assert.ok(!JSON.stringify(await failed.json()).includes("private-token"));
  } finally { console.error = original; }
});

for (const status of [401, 403, 429, 500]) {
  test(`lookup returns no-store ${status} without invoice reads`, async () => {
    const codes = { 401: 'POS_UNAUTHORIZED', 403: 'POS_SCOPE_FORBIDDEN', 429: 'POS_RATE_LIMITED', 500: 'POS_AUTH_UNAVAILABLE' };
    const response = await handlePosSaleLookupRequest(request, 'invoice-1', {
      authenticate: async () => ({ ok: false, status, code: codes[status] }),
      findSale: async () => assert.fail('unauthorized database read'),
    });
    assert.equal(response.status, status);
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
}

test('invalid IDs never reach storage, including trailing newline', async () => {
  for (const id of ['', 'a'.repeat(129), 'a/b', 'a?b', ' a', 'a ', 'فاکتور', 'a\n', 'a\r']) {
    const response = await handlePosSaleLookupRequest(request, id, {
      authenticate: async () => device('counter-1'), findSale: async () => assert.fail('invalid id'),
    });
    assert.equal(response.status, 400, JSON.stringify(id));
  }
});

test('sales submission disabled does not disable reconciliation', async () => {
  const previous = process.env.POS_SALES_ENABLED;
  process.env.POS_SALES_ENABLED = 'false';
  try {
    const response = await handlePosSaleLookupRequest(request, 'invoice-1', {
      authenticate: async () => device('counter-1'), findSale: async () => receipt,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).registrationStatus, 'registered');
  } finally {
    if (previous === undefined) delete process.env.POS_SALES_ENABLED;
    else process.env.POS_SALES_ENABLED = previous;
  }
});

test('actual authentication rejects catalog-only device before sales lookup', async () => {
  const { authenticatePosRequestCore } = await import('./lib/pos/auth-core.ts');
  const request = new Request('http://localhost/api/pos/v1/sales/invoice-1', { headers: {
    'X-POS-Device-ID': 'pos_12345678-1234-4123-8123-123456789abc',
    authorization: 'Bearer kpos_v1_' + 'a'.repeat(43),
  } });
  const response = await handlePosSaleLookupRequest(request, 'invoice-1', {
    authenticate: req => authenticatePosRequestCore(req, ['sales'], {
      hashToken: () => 'synthetic-hash',
      findDevice: async () => ({ ...device('pos_12345678-1234-4123-8123-123456789abc').device, scopes: ['catalog'] }),
      consumeRequestLimit: async () => ({ allowed: true }), consumeFailureLimit: async () => ({ allowed: true }),
      touchDevice: async () => assert.fail('touch before authorization'),
    }),
    findSale: async () => assert.fail('query before authorization'),
  });
  assert.equal(response.status, 403);
});
