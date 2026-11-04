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
