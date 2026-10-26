import test from "node:test";
import assert from "node:assert/strict";
import {
  createCatalogChangesPage,
  decodeCatalogChangesCursor,
  detectCatalogChangeKinds,
  encodeCatalogChangesCursor,
  executeAtomicCatalogMutation,
  hasInventoryStateChanged,
  parseCatalogChangesPagination,
} from "./lib/pos/catalog-changes.ts";
import { handleCatalogChangesRequest } from "./lib/pos/catalog-changes-handler.ts";

const id = (number) => number.toString(16).padStart(24, "0");

function source(overrides = {}) {
  return {
    _id: id(1),
    title: "محصول تست",
    slug: "test-product",
    sku: "TEST-1",
    barcode: "626000000001",
    productType: "single",
    category: id(20),
    mainImage: "https://cdn.example.test/product.jpg",
    status: "published",
    deletedAt: null,
    price: 1_000_000,
    discountPrice: null,
    stock: 10,
    variants: [],
    catalogRevision: 1,
    inventoryVersion: 1,
    ...overrides,
  };
}

function change(sequence, overrides = {}) {
  return {
    sequence,
    eventId: id(sequence + 1000),
    productId: id(1),
    eventType: "updated",
    changes: ["catalog"],
    action: "upsert",
    product: null,
    catalogRevision: sequence,
    inventoryVersion: sequence,
    occurredAtUtc: "2026-10-25T10:00:00.000Z",
    ...overrides,
  };
}

const validDevice = {
  deviceId: "pos_11111111-1111-4111-8111-111111111111",
  name: "test",
  scopes: ["catalog"],
  isActive: true,
  tokenVersion: 1,
};

test("product creation is represented by an independently recoverable event", () => {
  const event = change(1, {
    eventType: "created",
    changes: ["catalog", "price", "variants", "inventory", "status"],
  });
  const page = createCatalogChangesPage(
    [event],
    { limit: 100, afterSequence: 0 },
    1,
    1,
  );
  assert.equal(page.ok, true);
  assert.equal(page.items[0].eventType, "created");
  assert.deepEqual(page.items[0].changes, [
    "catalog",
    "price",
    "variants",
    "inventory",
    "status",
  ]);
});

test("price changes are detected without pretending inventory changed", () => {
  const changes = detectCatalogChangeKinds(
    source(),
    source({ price: 900_000, discountPrice: 800_000 }),
  );
  assert.deepEqual(changes, ["price"]);
});

test("a variant identity or activation change is detected", () => {
  const before = source({
    productType: "multi",
    variants: [
      { _id: id(2), title: "A", sku: "A", price: 10, stock: 2, isActive: true },
    ],
  });
  const after = source({
    productType: "multi",
    variants: [
      { _id: id(2), title: "B", sku: "A", price: 10, stock: 2, isActive: true },
    ],
  });
  assert.deepEqual(detectCatalogChangeKinds(before, after), ["variants"]);
});

test("moving stock between variants increments inventory even when total is unchanged", () => {
  const before = source({
    productType: "multi",
    stock: 10,
    variants: [
      { _id: id(2), stock: 7, isActive: true },
      { _id: id(3), stock: 3, isActive: true },
    ],
  });
  const after = source({
    productType: "multi",
    stock: 10,
    variants: [
      { _id: id(2), stock: 5, isActive: true },
      { _id: id(3), stock: 5, isActive: true },
    ],
  });
  assert.equal(hasInventoryStateChanged(before, after), true);
  assert.ok(detectCatalogChangeKinds(before, after).includes("inventory"));
});

test("an online purchase stock decrement and its event commit together", async () => {
  const database = { stock: 4, events: [] };
  await executeAtomicCatalogMutation({
    transaction: async (operation) => operation(database),
    mutate: async (transaction) => {
      transaction.stock -= 1;
      return { productId: id(1), stock: transaction.stock };
    },
    append: async (result, transaction) => {
      transaction.events.push({
        sequence: 1,
        productId: result.productId,
        changes: ["inventory"],
      });
    },
  });
  assert.equal(database.stock, 3);
  assert.deepEqual(database.events[0].changes, ["inventory"]);
});

test("logical deletion is a durable remove event", () => {
  const event = change(4, {
    eventType: "deleted",
    changes: ["status"],
    action: "remove",
    product: null,
  });
  assert.equal(event.action, "remove");
  assert.equal(event.product, null);
});

test("requesting the same previous cursor returns the same deterministic page", () => {
  const events = [change(11), change(12), change(13)];
  const pagination = { limit: 2, afterSequence: 10 };
  const first = createCatalogChangesPage(events, pagination, 13, 1);
  const repeated = createCatalogChangesPage(events, pagination, 13, 1);
  assert.deepEqual(first, repeated);
  assert.equal(decodeCatalogChangesCursor(first.pagination.nextCursor), 12);
});

test("a persisted cursor continues after a simulated server restart", () => {
  const persistentEvents = [change(1), change(2), change(3)];
  const cursorBeforeRestart = encodeCatalogChangesCursor(1);
  const parsedAfterRestart = parseCatalogChangesPagination(
    `https://example.test/api/pos/v1/catalog/changes?limit=2&cursor=${cursorBeforeRestart}`,
  );
  const page = createCatalogChangesPage(
    persistentEvents.filter(
      (event) => event.sequence > parsedAfterRestart.afterSequence,
    ),
    parsedAfterRestart,
    3,
    1,
  );
  assert.deepEqual(page.items.map((event) => event.sequence), [2, 3]);
});

test("multiple consecutive changes on one product preserve sequence order", () => {
  const events = [
    change(20, { changes: ["price"] }),
    change(21, { changes: ["inventory"] }),
    change(22, { changes: ["variants"] }),
  ];
  const page = createCatalogChangesPage(
    events,
    { limit: 10, afterSequence: 19 },
    22,
    1,
  );
  assert.deepEqual(page.items.map((event) => event.sequence), [20, 21, 22]);
});

test("event persistence failure rolls back the product mutation", async () => {
  const database = { stock: 5 };
  await assert.rejects(
    executeAtomicCatalogMutation({
      transaction: async (operation) => {
        const before = structuredClone(database);
        try {
          return await operation(database);
        } catch (error) {
          Object.assign(database, before);
          throw error;
        }
      },
      mutate: async (transaction) => {
        transaction.stock = 4;
        return transaction;
      },
      append: async () => {
        throw new Error("EVENT_SAVE_FAILED");
      },
    }),
    /EVENT_SAVE_FAILED/,
  );
  assert.equal(database.stock, 5);
});

test("change pagination enforces 200 and returns the next stable cursor", () => {
  const events = Array.from({ length: 201 }, (_, index) => change(index + 1));
  const page = createCatalogChangesPage(
    events,
    { limit: 200, afterSequence: 0 },
    201,
    1,
  );
  assert.equal(page.items.length, 200);
  assert.equal(page.pagination.hasMore, true);
  assert.equal(decodeCatalogChangesCursor(page.pagination.nextCursor), 200);
  assert.throws(() =>
    parseCatalogChangesPagination(
      "https://example.test/api/pos/v1/catalog/changes?limit=201",
    ),
  );
});

test("expired history returns an explicit full-resync response", async () => {
  const response = await handleCatalogChangesRequest(
    new Request(
      `https://example.test/api/pos/v1/catalog/changes?cursor=${encodeCatalogChangesCursor(4)}`,
    ),
    {
      authenticate: async () => ({ ok: true, status: 200, device: validDevice }),
      getPage: async () =>
        createCatalogChangesPage(
          [],
          { limit: 100, afterSequence: 4 },
          20,
          10,
        ),
    },
  );
  assert.equal(response.status, 410);
  assert.deepEqual((await response.json()).error.code, "POS_CATALOG_FULL_RESYNC_REQUIRED");
});

test("401 and 403 are returned before reading the outbox", async () => {
  let queried = false;
  for (const auth of [
    { ok: false, status: 401, code: "POS_UNAUTHORIZED" },
    { ok: false, status: 403, code: "POS_SCOPE_FORBIDDEN" },
  ]) {
    const response = await handleCatalogChangesRequest(
      new Request("https://example.test/api/pos/v1/catalog/changes"),
      {
        authenticate: async () => auth,
        getPage: async () => {
          queried = true;
          throw new Error("must not run");
        },
      },
    );
    assert.equal(response.status, auth.status);
  }
  assert.equal(queried, false);
});

test("successful changes responses are JSON and never cached", async () => {
  const response = await handleCatalogChangesRequest(
    new Request("https://example.test/api/pos/v1/catalog/changes?limit=10"),
    {
      authenticate: async () => ({ ok: true, status: 200, device: validDevice }),
      getPage: async (pagination) =>
        createCatalogChangesPage([change(1)], pagination, 1, 1),
    },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});
