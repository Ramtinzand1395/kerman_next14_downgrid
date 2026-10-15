import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  POS_CATALOG_READ_SCOPE,
  requirePosDeviceScope,
} from "./lib/pos/auth.ts";
import {
  decodeCatalogPageToken,
  handleCatalogSnapshotRequest,
} from "./lib/pos/catalogSnapshot.ts";

const IDS = {
  category: "64a000000000000000000001",
  first: "64b000000000000000000001",
  second: "64b000000000000000000002",
  third: "64b000000000000000000003",
  variantA: "64c000000000000000000001",
  variantB: "64c000000000000000000002",
};

function product(overrides = {}) {
  return {
    _id: IDS.first,
    title: "محصول نمونه",
    slug: "sample-product",
    sku: "SKU-1",
    status: "draft",
    productType: "single",
    price: 1_200_000,
    discountPrice: null,
    stock: 4,
    category: { _id: IDS.category, name: "کنسول" },
    mainImage: "https://example.test/product.jpg",
    catalogRevision: 0,
    inventoryVersion: 0,
    deletedAt: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    variants: [],
    ...overrides,
  };
}

function authorized() {
  return Promise.resolve({
    ok: true,
    principal: {
      deviceId: "device-test",
      scopes: [POS_CATALOG_READ_SCOPE],
    },
  });
}

function createMemoryReader(records) {
  const ordered = [...records]
    .filter(
      (record) =>
        record.deletedAt == null &&
        (record.status === "draft" || record.status === "published"),
    )
    .sort((left, right) => left._id.localeCompare(right._id));

  return async ({ afterId, limit }) =>
    ordered
      .filter((record) => !afterId || record._id > afterId)
      .slice(0, limit);
}

async function requestSnapshot({
  records = [product()],
  url = "https://example.test/api/pos/v1/catalog/snapshot",
  authorize = authorized,
  headers,
  logs = [],
} = {}) {
  const response = await handleCatalogSnapshotRequest(
    new Request(url, { headers }),
    {
      authorize,
      fetchPage: createMemoryReader(records),
      now: () => new Date("2026-10-15T00:00:00.000Z"),
      logInvalidItem: (entry) => logs.push(entry),
      logInternalError: (entry) => logs.push(entry),
    },
  );
  return { response, body: await response.json(), logs };
}

test("unauthorized request fails closed before reading catalog", async () => {
  let readCount = 0;
  const request = new Request(
    "https://example.test/api/pos/v1/catalog/snapshot",
  );
  const response = await handleCatalogSnapshotRequest(request, {
    authorize: (incomingRequest) =>
      requirePosDeviceScope(incomingRequest, POS_CATALOG_READ_SCOPE),
    fetchPage: async () => {
      readCount += 1;
      return [];
    },
  });
  assert.equal(response.status, 401);
  assert.equal(readCount, 0);
  assert.equal((await response.json()).error.code, "UNAUTHORIZED");
});

test("authenticated device without catalog:read receives FORBIDDEN", async () => {
  const request = new Request(
    "https://example.test/api/pos/v1/catalog/snapshot",
    { headers: { Authorization: "Bearer test-token" } },
  );
  const authorization = await requirePosDeviceScope(
    request,
    POS_CATALOG_READ_SCOPE,
    {
      async verify() {
        return { deviceId: "device-test", scopes: ["sync:read"] };
      },
    },
  );
  assert.equal(authorization.ok, false);
  assert.equal(authorization.status, 403);
  assert.equal(authorization.code, "FORBIDDEN");
});

test("valid catalog:read credential can read the snapshot", async () => {
  const request = new Request(
    "https://example.test/api/pos/v1/catalog/snapshot",
    { headers: { Authorization: "Bearer test-token" } },
  );
  const authorize = (incomingRequest) =>
    requirePosDeviceScope(incomingRequest, POS_CATALOG_READ_SCOPE, {
      async verify() {
        return {
          deviceId: "device-test",
          scopes: [POS_CATALOG_READ_SCOPE],
        };
      },
    });
  const { response, body } = await requestSnapshot({
    authorize,
    headers: request.headers,
  });
  assert.equal(response.status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.consistency, "best-effort");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("single product is serialized to the versioned POS contract", async () => {
  const { body } = await requestSnapshot();
  assert.deepEqual(body.items[0], {
    productId: IDS.first,
    name: "محصول نمونه",
    slug: "sample-product",
    sku: "SKU-1",
    status: "draft",
    productType: "single",
    basePriceToman: 1_200_000,
    discountedPriceToman: null,
    centralStock: 4,
    category: { id: IDS.category, name: "کنسول" },
    imageUrl: "https://example.test/product.jpg",
    catalogRevision: 0,
    inventoryVersion: 0,
    siteCreatedAtUtc: "2026-10-01T00:00:00.000Z",
    siteUpdatedAtUtc: "2026-10-02T00:00:00.000Z",
    variants: [],
  });
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.generatedAtUtc, "2026-10-15T00:00:00.000Z");
});

test("multi product derives and verifies variant stock", async () => {
  const { body } = await requestSnapshot({
    records: [
      product({
        productType: "multi",
        stock: 5,
        variants: [
          {
            _id: IDS.variantA,
            title: "نسخه اول",
            sku: null,
            price: 1_000_000,
            discountPrice: null,
            stock: 2,
          },
          {
            _id: IDS.variantB,
            title: "نسخه دوم",
            sku: "V-2",
            price: 1_100_000,
            discountPrice: 1_000_000,
            stock: 3,
          },
        ],
      }),
    ],
  });
  assert.equal(body.items[0].centralStock, 5);
  assert.equal(body.items[0].variants.length, 2);
});

test("variant ids are preserved in the response", async () => {
  const { body } = await requestSnapshot({
    records: [
      product({
        productType: "multi",
        stock: 2,
        variants: [
          {
            _id: IDS.variantA,
            title: "نسخه",
            sku: null,
            price: 1,
            discountPrice: null,
            stock: 2,
          },
        ],
      }),
    ],
  });
  assert.equal(body.items[0].variants[0].variantId, IDS.variantA);
});

test("draft products are returned", async () => {
  const { body } = await requestSnapshot({
    records: [product({ status: "draft" })],
  });
  assert.equal(body.items[0].status, "draft");
});

test("published products are returned", async () => {
  const { body } = await requestSnapshot({
    records: [product({ status: "published" })],
  });
  assert.equal(body.items[0].status, "published");
});

test("soft-deleted products are excluded from the POS snapshot", async () => {
  const { body } = await requestSnapshot({
    records: [product({ deletedAt: new Date() })],
  });
  assert.deepEqual(body.items, []);
  assert.equal(body.invalidItemCount, 0);
});

test("invalid legacy price is excluded and counted safely", async () => {
  const logs = [];
  const { body } = await requestSnapshot({
    records: [product({ price: 1.5 })],
    logs,
  });
  assert.deepEqual(body.items, []);
  assert.equal(body.invalidItemCount, 1);
  assert.equal(logs[0].reasonCode, "INVALID_PRICE");
});

test("invalid legacy stock is excluded and counted safely", async () => {
  const { body } = await requestSnapshot({
    records: [product({ stock: -1 })],
  });
  assert.deepEqual(body.items, []);
  assert.equal(body.invalidItemCount, 1);
});

test("variant and parent stock mismatch is excluded without repair", async () => {
  const logs = [];
  const { body } = await requestSnapshot({
    records: [
      product({
        productType: "multi",
        stock: 99,
        variants: [
          {
            _id: IDS.variantA,
            title: "نسخه",
            sku: null,
            price: 1,
            discountPrice: null,
            stock: 2,
          },
        ],
      }),
    ],
    logs,
  });
  assert.deepEqual(body.items, []);
  assert.equal(body.invalidItemCount, 1);
  assert.equal(logs[0].reasonCode, "VARIANT_STOCK_MISMATCH");
});

test("first page uses stable ObjectId order and returns an opaque cursor", async () => {
  const records = [
    product({ _id: IDS.third, slug: "third" }),
    product({ _id: IDS.first, slug: "first" }),
    product({ _id: IDS.second, slug: "second" }),
  ];
  const { body } = await requestSnapshot({
    records,
    url: "https://example.test/api/pos/v1/catalog/snapshot?limit=2",
  });
  assert.deepEqual(
    body.items.map((item) => item.productId),
    [IDS.first, IDS.second],
  );
  assert.equal(decodeCatalogPageToken(body.nextPageToken), IDS.second);
});

test("next page starts strictly after the previous ObjectId", async () => {
  const records = [
    product({ _id: IDS.first }),
    product({ _id: IDS.second }),
    product({ _id: IDS.third }),
  ];
  const first = await requestSnapshot({
    records,
    url: "https://example.test/api/pos/v1/catalog/snapshot?limit=2",
  });
  const second = await requestSnapshot({
    records,
    url: `https://example.test/api/pos/v1/catalog/snapshot?limit=2&pageToken=${first.body.nextPageToken}`,
  });
  assert.deepEqual(
    second.body.items.map((item) => item.productId),
    [IDS.third],
  );
  assert.equal(second.body.nextPageToken, null);
});

test("invalid page token returns INVALID_PAGE_TOKEN", async () => {
  const { response, body } = await requestSnapshot({
    url: "https://example.test/api/pos/v1/catalog/snapshot?pageToken=broken",
  });
  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_PAGE_TOKEN");
});

test("limit accepts 200 and rejects values above the maximum", async () => {
  const accepted = await requestSnapshot({
    url: "https://example.test/api/pos/v1/catalog/snapshot?limit=200",
  });
  assert.equal(accepted.response.status, 200);

  const rejected = await requestSnapshot({
    url: "https://example.test/api/pos/v1/catalog/snapshot?limit=201",
  });
  assert.equal(rejected.response.status, 400);
  assert.equal(rejected.body.error.code, "INVALID_LIMIT");
});

test("ordering remains stable regardless of source insertion order", async () => {
  const { body } = await requestSnapshot({
    records: [
      product({ _id: IDS.second }),
      product({ _id: IDS.first }),
      product({ _id: IDS.third }),
    ],
  });
  assert.deepEqual(
    body.items.map((item) => item.productId),
    [IDS.first, IDS.second, IDS.third],
  );
});

test("comments, tags, specifications and descriptions never leak", async () => {
  const { body } = await requestSnapshot({
    records: [
      product({
        comments: [{ text: "private" }],
        tags: [{ name: "tag" }],
        specifications: [{ title: "spec" }],
        description: "internal description",
      }),
    ],
  });
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(
    serialized,
    /comments|private|tags|specifications|description|internal description/,
  );
});

const routeSource = readFileSync(
  new URL("./app/api/pos/v1/catalog/snapshot/route.ts", import.meta.url),
  "utf8",
);

test("POS catalog route contains no MongoDB write operation", () => {
  assert.doesNotMatch(
    routeSource,
    /\.(?:create|save|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|findOneAndDelete)\s*\(|\$(?:inc|set|unset|push|pull)\b/i,
  );
  assert.match(routeSource, /Product\.find\(filter\)/);
});

test("POS catalog route does not import or create CatalogChange", () => {
  assert.doesNotMatch(routeSource, /CatalogChange/);
});

test("POS catalog route does not import or create InventoryOperation", () => {
  assert.doesNotMatch(routeSource, /InventoryOperation/);
});
