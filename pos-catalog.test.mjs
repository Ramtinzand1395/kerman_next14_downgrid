import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG_VISIBLE_MATCH,
  CatalogPaginationError,
  createCatalogSnapshotPage,
  decodeCatalogCursor,
  isCatalogProductVisible,
  mapCatalogProduct,
  parseCatalogPagination,
} from "./lib/pos/catalog.ts";
import { handleCatalogSnapshotRequest } from "./lib/pos/catalog-handler.ts";
import {
  collectCatalogIdentities,
  differenceCatalogIdentities,
} from "./lib/pos/catalog-identities.ts";

const id = (number) => number.toString(16).padStart(24, "0");

function product(overrides = {}) {
  return {
    _id: id(1),
    title: "کنسول تست",
    slug: "test-console",
    sku: "SITE-001",
    barcode: "626000000001",
    productType: "single",
    category: { _id: id(9), name: "کنسول", slug: "console" },
    mainImage: "https://cdn.example.test/product.jpg",
    status: "published",
    deletedAt: null,
    price: 12_000_000,
    discountPrice: null,
    stock: 3,
    variants: [],
    catalogRevision: 4,
    inventoryVersion: 2,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-02T10:00:00.000Z"),
    ...overrides,
  };
}

test("single products expose stable SKU, barcode, integer price and stock", () => {
  const item = mapCatalogProduct(product());
  assert.equal(item.productId, id(1));
  assert.equal(item.sku, "SITE-001");
  assert.equal(item.barcode, "626000000001");
  assert.equal(item.basePriceToman, 12_000_000);
  assert.equal(item.centralStock, 3);
  assert.deepEqual(item.variants, []);
});

test("multi products use the default active variant price and variant stock", () => {
  const firstVariantId = id(2);
  const defaultVariantId = id(3);
  const item = mapCatalogProduct(
    product({
      productType: "multi",
      barcode: "PARENT-BARCODE-MUST-NOT-LEAK",
      price: 1,
      stock: 999,
      defaultVariantId,
      variants: [
        {
          _id: firstVariantId,
          title: "نسخه معمولی",
          sku: "VAR-1",
          barcode: "1001",
          price: 10_000_000,
          discountPrice: null,
          stock: 2,
          isActive: true,
        },
        {
          _id: defaultVariantId,
          title: "نسخه ویژه",
          sku: "VAR-2",
          barcode: "1002",
          price: 15_000_000,
          discountPrice: 14_000_000,
          stock: 4,
          isActive: true,
        },
        {
          _id: id(4),
          title: "نسخه قدیمی",
          price: 8_000_000,
          stock: 20,
          isActive: false,
        },
      ],
      variantSelector: {
        enabled: true,
        groups: [
          {
            id: "edition",
            key: "edition",
            label: "نسخه",
            order: 0,
            options: [{ id: "special", label: "ویژه" }],
          },
        ],
        mappings: [
          { variantId: defaultVariantId, optionIds: { edition: "special" } },
        ],
      },
    }),
  );
  assert.equal(item.barcode, null);
  assert.equal(item.basePriceToman, 15_000_000);
  assert.equal(item.discountedPriceToman, 14_000_000);
  assert.equal(item.centralStock, 6);
  assert.equal(item.variants[0].basePriceToman, 10_000_000);
  assert.equal(item.variants[1].basePriceToman, 15_000_000);
  assert.deepEqual(item.variants[1].attributes, [
    {
      groupId: "edition",
      key: "edition",
      label: "نسخه",
      optionId: "special",
      optionLabel: "ویژه",
    },
  ]);
  assert.equal(item.variants[2].isActive, false);
});

test("discounted single prices and zero stock remain exact integers", () => {
  const item = mapCatalogProduct(
    product({ price: 900_000, discountPrice: 750_000, stock: 0 }),
  );
  assert.equal(item.basePriceToman, 900_000);
  assert.equal(item.discountedPriceToman, 750_000);
  assert.equal(item.centralStock, 0);
  assert.equal(Number.isSafeInteger(item.centralStock), true);
});

test("draft and deleted products are outside the snapshot contract", () => {
  assert.equal(CATALOG_VISIBLE_MATCH.status, "published");
  assert.equal(isCatalogProductVisible(product({ status: "draft" })), false);
  assert.equal(
    isCatalogProductVisible(product({ deletedAt: new Date() })),
    false,
  );
  assert.equal(isCatalogProductVisible(product()), true);
});

test("more than 200 products are cursor paginated at the hard maximum", () => {
  const documents = Array.from({ length: 201 }, (_, index) =>
    product({ _id: id(index + 1), slug: `product-${index + 1}` }),
  );
  const page = createCatalogSnapshotPage(documents, 200);
  assert.equal(page.items.length, 200);
  assert.equal(page.pagination.hasMore, true);
  assert.equal(decodeCatalogCursor(page.pagination.nextCursor), id(200));
  assert.equal(
    parseCatalogPagination(
      `https://example.test/api/pos/v1/catalog/snapshot?limit=200&cursor=${page.pagination.nextCursor}`,
    ).cursorId,
    id(200),
  );
});

test("invalid cursors and limits are rejected", () => {
  assert.throws(
    () =>
      parseCatalogPagination(
        "https://example.test/api/pos/v1/catalog/snapshot?cursor=not-a-cursor",
      ),
    CatalogPaginationError,
  );
  assert.throws(
    () =>
      parseCatalogPagination(
        "https://example.test/api/pos/v1/catalog/snapshot?limit=201",
      ),
    CatalogPaginationError,
  );
});

test("SKU and barcode identities are normalized and changed values are isolated", () => {
  const previous = collectCatalogIdentities({
    sku: " SITE-001 ",
    variants: [{ sku: "VAR-1", barcode: "ABC-1" }],
  });
  const next = collectCatalogIdentities({
    sku: "site-001",
    barcode: "NEW-BARCODE",
    variants: [{ sku: "var-1", barcode: "ABC-2" }],
  });
  assert.deepEqual(previous, {
    skus: ["site-001", "var-1"],
    barcodes: ["abc-1"],
  });
  assert.deepEqual(differenceCatalogIdentities(next, previous), {
    skus: [],
    barcodes: ["new-barcode", "abc-2"],
  });
});

test("incomplete legacy documents are normalized without leaking invalid types", () => {
  const item = mapCatalogProduct({
    _id: id(7),
    status: "published",
    productType: "single",
    price: "1000",
    stock: null,
    discountPrice: -1,
    variants: [{ _id: "invalid", price: 10 }],
    __v: 99,
    deletedAt: null,
  });
  assert.equal(item.name, "");
  assert.equal(item.basePriceToman, 0);
  assert.equal(item.discountedPriceToman, null);
  assert.equal(item.centralStock, 0);
  assert.equal(item.category, null);
  assert.equal(item.siteCreatedAtUtc, null);
  assert.deepEqual(item.variants, []);
});

test("catalog handler returns 401 and 403 before querying products", async () => {
  let queried = false;
  const getPage = async () => {
    queried = true;
    throw new Error("must not run");
  };
  for (const auth of [
    { ok: false, status: 401, code: "POS_UNAUTHORIZED" },
    { ok: false, status: 403, code: "POS_SCOPE_FORBIDDEN" },
  ]) {
    const response = await handleCatalogSnapshotRequest(
      new Request("https://example.test/api/pos/v1/catalog/snapshot"),
      { authenticate: async () => auth, getPage },
    );
    assert.equal(response.status, auth.status);
  }
  assert.equal(queried, false);
});

test("catalog handler returns JSON 400 for an invalid cursor", async () => {
  let queried = false;
  const response = await handleCatalogSnapshotRequest(
    new Request(
      "https://example.test/api/pos/v1/catalog/snapshot?cursor=invalid",
    ),
    {
      authenticate: async () => ({
        ok: true,
        status: 200,
        device: {
          deviceId: "pos_11111111-1111-4111-8111-111111111111",
          name: "test",
          scopes: ["catalog"],
          isActive: true,
          tokenVersion: 1,
        },
      }),
      getPage: async () => {
        queried = true;
        return createCatalogSnapshotPage([], 100);
      },
    },
  );
  assert.equal(response.status, 400);
  assert.equal(queried, false);
  assert.deepEqual(await response.json(), {
    error: { code: "POS_CATALOG_INVALID_PAGINATION" },
  });
});

test("catalog handler returns JSON with no-store headers", async () => {
  const response = await handleCatalogSnapshotRequest(
    new Request("https://example.test/api/pos/v1/catalog/snapshot?limit=1"),
    {
      authenticate: async () => ({
        ok: true,
        status: 200,
        device: {
          deviceId: "pos_11111111-1111-4111-8111-111111111111",
          name: "test",
          scopes: ["catalog"],
          isActive: true,
          tokenVersion: 1,
        },
      }),
      getPage: async ({ limit }) =>
        createCatalogSnapshotPage([product()], limit),
    },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("database-only and internal fields never appear in the contract", () => {
  const item = mapCatalogProduct(
    product({
      __v: 9,
      deletedAt: null,
      internalCost: 10,
      variants: [
        {
          _id: id(8),
          title: "مدل",
          price: 100,
          stock: 1,
          isActive: true,
          purchaseCost: 20,
          __v: 3,
        },
      ],
      productType: "multi",
    }),
  );
  const serialized = JSON.stringify(item);
  for (const forbidden of [
    "_id",
    "__v",
    "deletedAt",
    "internalCost",
    "purchaseCost",
    "defaultVariantId",
    "variantSelector",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
