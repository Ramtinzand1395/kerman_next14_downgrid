import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGalleryItem,
  computeRetryDelayMs,
  decideGallerySync,
  GallerySyncConfigurationError,
  GallerySyncRequestError,
  getGallerySyncConfig,
  PRODUCTION_SYNC_URL,
  sendGallerySyncRequest,
} from "./lib/gallery-sync.mjs";

const wallId = "66aa00000000000000000001";
const otherId = "66aa00000000000000000002";
const baseProduct = {
  _id: "66bb00000000000000000001",
  title: "تابلو The Last of Us",
  mainImage: "https://images.example/main.webp",
  images: [
    { url: "https://images.example/second.webp", alt: "second" },
    { url: "javascript:alert(1)", alt: "bad" },
  ],
  status: "published",
  deletedAt: null,
  category: wallId,
  price: 100,
  stock: 3,
};
const validEnv = {
  GALLERY_SYNC_URL: PRODUCTION_SYNC_URL,
  GALLERY_SYNC_API_KEY: "test-secret",
};

test("requires the exact production HTTPS sync endpoint", () => {
  assert.deepEqual(getGallerySyncConfig(validEnv), {
    url: PRODUCTION_SYNC_URL,
    apiKey: "test-secret",
  });
  assert.throws(
    () =>
      getGallerySyncConfig({
        ...validEnv,
        GALLERY_SYNC_URL: "http://katalog-beryl.vercel.app/api/sync",
      }),
    GallerySyncConfigurationError,
  );
  assert.throws(
    () =>
      getGallerySyncConfig({
        ...validEnv,
        GALLERY_SYNC_URL: `${PRODUCTION_SYNC_URL}?next=https://example.com`,
      }),
    GallerySyncConfigurationError,
  );
});

test("requires a server-side API key", () => {
  assert.throws(
    () => getGallerySyncConfig({ GALLERY_SYNC_URL: PRODUCTION_SYNC_URL }),
    GallerySyncConfigurationError,
  );
});

test("sends bearer authentication and rejects redirects", async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  await sendGallerySyncRequest(
    { action: "delete", sourceId: "source-1" },
    { env: validEnv, fetchImpl },
  );

  assert.equal(observed.url, PRODUCTION_SYNC_URL);
  assert.equal(observed.options.headers.Authorization, "Bearer test-secret");
  assert.equal(observed.options.redirect, "error");
  assert.equal(observed.options.method, "POST");
});

test("payload contains only the catalog fields", () => {
  const item = buildGalleryItem(baseProduct);
  assert.deepEqual(Object.keys(item), [
    "sourceId",
    "name",
    "imageUrl",
    "images",
    "sortOrder",
    "isVisible",
  ]);
  assert.deepEqual(item.images, [
    "https://images.example/main.webp",
    "https://images.example/second.webp",
  ]);
  assert.equal("price" in item, false);
  assert.equal("stock" in item, false);
});

test("draft wall art remains synchronized but hidden", () => {
  const item = buildGalleryItem({ ...baseProduct, status: "draft" });
  assert.equal(item.isVisible, false);
});

test("create in wall-art category becomes upsert", () => {
  const result = decideGallerySync(null, baseProduct, wallId);
  assert.equal(result.action, "upsert");
  assert.equal(result.item.sourceId, baseProduct._id);
});

test("create outside wall-art category is ignored", () => {
  const result = decideGallerySync(
    null,
    { ...baseProduct, category: otherId },
    wallId,
  );
  assert.equal(result, null);
});

test("update within wall-art category becomes upsert", () => {
  const result = decideGallerySync(
    baseProduct,
    { ...baseProduct, title: "نام جدید" },
    wallId,
  );
  assert.equal(result.action, "upsert");
  assert.equal(result.item.name, "نام جدید");
});

test("moving into wall-art category becomes upsert", () => {
  const result = decideGallerySync(
    { ...baseProduct, category: otherId },
    baseProduct,
    wallId,
  );
  assert.equal(result.action, "upsert");
});

test("moving out of wall-art category becomes delete", () => {
  const result = decideGallerySync(
    baseProduct,
    { ...baseProduct, category: otherId },
    wallId,
  );
  assert.deepEqual(result, { action: "delete", sourceId: baseProduct._id });
});

test("deleting wall art becomes delete", () => {
  const result = decideGallerySync(baseProduct, null, wallId);
  assert.deepEqual(result, { action: "delete", sourceId: baseProduct._id });
});

test("deleting a non-wall-art product is ignored", () => {
  const result = decideGallerySync(
    { ...baseProduct, category: otherId },
    null,
    wallId,
  );
  assert.equal(result, null);
});

test("network failures are safe request errors", async () => {
  await assert.rejects(
    sendGallerySyncRequest(
      { action: "delete", sourceId: "source-1" },
      {
        env: validEnv,
        fetchImpl: async () => {
          throw new Error("socket closed");
        },
      },
    ),
    (error) =>
      error instanceof GallerySyncRequestError && error.code === "network",
  );
});

test("HTTP failures expose status without response secrets", async () => {
  await assert.rejects(
    sendGallerySyncRequest(
      { action: "delete", sourceId: "source-1" },
      {
        env: validEnv,
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          json: async () => ({ error: "do not expose this" }),
        }),
      },
    ),
    (error) =>
      error instanceof GallerySyncRequestError &&
      error.status === 401 &&
      !error.message.includes("do not expose this") &&
      !error.message.includes("test-secret"),
  );
});

test("retry backoff is exponential and bounded", () => {
  assert.equal(computeRetryDelayMs(1, () => 0), 5_000);
  assert.equal(computeRetryDelayMs(2, () => 0), 10_000);
  assert.equal(computeRetryDelayMs(20, () => 0), 3_600_000);
  assert.equal(computeRetryDelayMs(20, () => 1), 4_320_000);
});
