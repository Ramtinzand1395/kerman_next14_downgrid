import test from "node:test";
import assert from "node:assert/strict";
import {
  createPosPriceSnapshot,
  fingerprintPosSaleRequest,
  validatePosSaleRequest,
} from "./lib/pos/sales-contract.ts";
import { handlePosSaleRequest } from "./lib/pos/sales-handler.ts";
import {
  PosSaleConflictError,
  PosSaleIdempotencyConflictError,
} from "./lib/pos/sales-errors.ts";

const id = (number) => number.toString(16).padStart(24, "0");

function body(overrides = {}) {
  return {
    saleId: "desktop-sale-001",
    soldAtUtc: "2020-10-26T10:00:00.000Z",
    items: [
      {
        productId: id(1),
        variantId: null,
        quantity: 2,
        unitPriceToman: 1_000_000,
        discountToman: 100_000,
      },
    ],
    finalAmountToman: 1_800_000,
    paymentMethods: [
      { method: "card", amountToman: 1_800_000, reference: "terminal-1" },
    ],
    customer: null,
    cashier: { cashierId: "cashier-1", name: "صندوقدار تست" },
    ...overrides,
  };
}

const validDevice = {
  deviceId: "pos_11111111-1111-4111-8111-111111111111",
  name: "POS Test",
  scopes: ["sales"],
  isActive: true,
  tokenVersion: 1,
};

function request(payload = body()) {
  return new Request("https://example.test/api/pos/v1/sales", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

test("sale contract accepts only exact integer Toman totals", () => {
  const sale = validatePosSaleRequest(body());
  assert.equal(sale.items[0].finalAmountToman, 1_800_000);
  assert.equal(sale.finalAmountToman, 1_800_000);
  assert.throws(
    () => validatePosSaleRequest(body({ finalAmountToman: 1_800_000.5 })),
    /safe integer/,
  );
  assert.throws(
    () =>
      validatePosSaleRequest(
        body({
          paymentMethods: [
            { method: "card", amountToman: 1_700_000, reference: null },
          ],
        }),
      ),
    /do not match/,
  );
});

test("canonical request hashes are stable across line and payment order", () => {
  const secondItem = {
    productId: id(2),
    variantId: id(3),
    quantity: 1,
    unitPriceToman: 500_000,
    discountToman: 0,
  };
  const first = validatePosSaleRequest(
    body({
      items: [...body().items, secondItem],
      finalAmountToman: 2_300_000,
      paymentMethods: [
        { method: "cash", amountToman: 500_000 },
        { method: "card", amountToman: 1_800_000, reference: "terminal-1" },
      ],
    }),
  );
  const second = validatePosSaleRequest(
    body({
      items: [secondItem, ...body().items],
      finalAmountToman: 2_300_000,
      paymentMethods: [
        { method: "card", amountToman: 1_800_000, reference: "terminal-1" },
        { method: "cash", amountToman: 500_000 },
      ],
    }),
  );
  assert.equal(fingerprintPosSaleRequest(first), fingerprintPosSaleRequest(second));
});

test("site price remains authoritative in an offline price mismatch snapshot", () => {
  const snapshot = createPosPriceSnapshot({
    siteBasePriceToman: 1_200_000,
    siteDiscountedPriceToman: 1_100_000,
    posUnitPriceToman: 1_000_000,
    posDiscountToman: 100_000,
  });
  assert.equal(snapshot.siteEffectivePriceToman, 1_100_000);
  assert.equal(snapshot.posNetUnitPriceToman, 900_000);
  assert.equal(snapshot.differenceToman, -200_000);
  assert.equal(snapshot.mismatch, true);
});

test("401 and 403 stop before the sale body is registered", async () => {
  let registrations = 0;
  for (const auth of [
    { ok: false, status: 401, code: "POS_UNAUTHORIZED" },
    { ok: false, status: 403, code: "POS_SCOPE_FORBIDDEN" },
  ]) {
    const response = await handlePosSaleRequest(request(), {
      authenticate: async () => auth,
      registerSale: async () => {
        registrations += 1;
        throw new Error("must not run");
      },
    });
    assert.equal(response.status, auth.status);
  }
  assert.equal(registrations, 0);
});

test("successful and replayed sales return 201 and 200 with no-store JSON", async () => {
  const sale = {
    saleId: "desktop-sale-001",
    deviceId: validDevice.deviceId,
    siteSaleId: id(90),
    invoiceNumber: `POS-${id(90).toUpperCase()}`,
    soldAtUtc: "2026-10-26T10:00:00.000Z",
    syncedAtUtc: "2026-10-26T10:01:00.000Z",
    items: [],
    finalAmountToman: 1_800_000,
    paymentMethods: [],
    customer: null,
    cashier: { cashierId: "cashier-1", name: "test" },
    syncStatus: "synced",
    reviewReasons: [],
  };
  for (const replayed of [false, true]) {
    const response = await handlePosSaleRequest(request(), {
      authenticate: async () => ({ ok: true, status: 200, device: validDevice }),
      registerSale: async () => ({ sale, replayed }),
    });
    assert.equal(response.status, replayed ? 200 : 201);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal((await response.json()).replayed, replayed);
  }
});

test("idempotency and inventory conflicts are stable 409 contracts", async () => {
  const errors = [
    new PosSaleIdempotencyConflictError(),
    new PosSaleConflictError("POS_SALE_INVENTORY_CONFLICT", [
      {
        productId: id(1),
        variantId: null,
        requestedQuantity: 2,
        availableQuantity: 1,
        reason: "insufficient_stock",
      },
    ]),
  ];
  for (const error of errors) {
    const response = await handlePosSaleRequest(request(), {
      authenticate: async () => ({ ok: true, status: 200, device: validDevice }),
      registerSale: async () => {
        throw error;
      },
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, error.code);
  }
});

test("malformed requests do not leak request contents into logs or responses", async () => {
  const secret = "customer-private-value";
  const captured = [];
  const previous = console.error;
  console.error = (...values) => captured.push(values.join(" "));
  try {
    const response = await handlePosSaleRequest(request({ secret }), {
      authenticate: async () => ({ ok: true, status: 200, device: validDevice }),
      registerSale: async () => {
        throw new Error(secret);
      },
    });
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes(secret), false);
    assert.equal(captured.join("\n").includes(secret), false);
  } finally {
    console.error = previous;
  }
});
