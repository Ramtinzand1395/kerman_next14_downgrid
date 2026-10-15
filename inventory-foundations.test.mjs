import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import Product from "./model/Product.ts";
import InventoryOperation, {
  classifyInventoryOperationReplay,
} from "./model/InventoryOperation.ts";
import PosDevice from "./model/PosDevice.ts";
import {
  buildProductWriteInput,
  ProductInputValidationError,
} from "./lib/productInput.ts";

function productBody(overrides = {}) {
  return {
    status: "draft",
    productType: "single",
    title: "محصول تست",
    slug: "test-product",
    price: 125_000,
    discountPrice: null,
    stock: 4,
    description: "",
    shortDesc: "",
    brand: "",
    seoTitle: "",
    metaDescription: "",
    mainImageAlt: "",
    mainImage: "https://example.test/product.jpg",
    galleryImages: [],
    specifications: [],
    faqs: [],
    variants: [],
    ...overrides,
  };
}

function variant(title, price, stock, id) {
  return {
    ...(id ? { _id: id } : {}),
    title,
    price,
    discountPrice: null,
    stock,
  };
}

test("existing variant ids survive edits and a new variant receives a new id", async () => {
  const initial = buildProductWriteInput(
    productBody({
      productType: "multi",
      stock: 999,
      variants: [
        variant("نسخه اول", 100_000, 2),
        variant("نسخه دوم", 120_000, 3),
      ],
    }),
    { mode: "create" },
  );
  const document = new Product({
    ...initial.productData,
    sku: "TEST-SKU",
    category: new mongoose.Types.ObjectId(),
  });
  await document.validate();

  const originalIds = document.variants.map((item) => String(item._id));
  const update = buildProductWriteInput(
    productBody({
      productType: "multi",
      stock: 0,
      variants: [
        variant("نسخه اول ویرایش‌شده", 110_000, 4, originalIds[0]),
        variant("نسخه دوم", 120_000, 3, originalIds[1]),
        variant("نسخه جدید", 130_000, 5),
      ],
    }),
    {
      mode: "update",
      productId: String(document._id),
      existingVariantIds: originalIds,
    },
  );

  document.set(update.productData);
  await document.validate();
  const updatedIds = document.variants.map((item) => String(item._id));

  assert.equal(updatedIds[0], originalIds[0]);
  assert.equal(updatedIds[1], originalIds[1]);
  assert.notEqual(updatedIds[2], originalIds[0]);
  assert.notEqual(updatedIds[2], originalIds[1]);
  assert.match(updatedIds[2], /^[0-9a-f]{24}$/);
});

test("foreign variant ids are rejected", () => {
  const ownedId = new mongoose.Types.ObjectId().toString();
  const foreignId = new mongoose.Types.ObjectId().toString();

  assert.throws(
    () =>
      buildProductWriteInput(
        productBody({
          productType: "multi",
          variants: [variant("جعلی", 100_000, 1, foreignId)],
        }),
        {
          mode: "update",
          productId: new mongoose.Types.ObjectId().toString(),
          existingVariantIds: [ownedId],
        },
      ),
    ProductInputValidationError,
  );
});

test("removed variants are detected for future CatalogChange emission", () => {
  const retainedId = new mongoose.Types.ObjectId().toString();
  const removedId = new mongoose.Types.ObjectId().toString();
  const result = buildProductWriteInput(
    productBody({
      productType: "multi",
      variants: [variant("باقی‌مانده", 100_000, 1, retainedId)],
    }),
    {
      mode: "update",
      productId: new mongoose.Types.ObjectId().toString(),
      existingVariantIds: [retainedId, removedId],
    },
  );

  assert.deepEqual(result.removedVariantIds, [removedId]);
});

test("Toman prices reject fractions, negatives, unsafe values, and oversized discounts", () => {
  for (const price of [12.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => buildProductWriteInput(productBody({ price }), { mode: "create" }),
      ProductInputValidationError,
    );
  }
  assert.throws(
    () =>
      buildProductWriteInput(
        productBody({ price: 100, discountPrice: 101 }),
        { mode: "create" },
      ),
    ProductInputValidationError,
  );

  const valid = buildProductWriteInput(
    productBody({ price: 150_000, discountPrice: 125_000 }),
    { mode: "create" },
  );
  assert.equal(valid.productData.price, 150_000);
  assert.equal(valid.productData.discountPrice, 125_000);
});

test("stock rejects fractions, negatives, unsafe values, and unsafe multi totals", () => {
  for (const stock of [1.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => buildProductWriteInput(productBody({ stock }), { mode: "create" }),
      ProductInputValidationError,
    );
  }
  assert.throws(
    () =>
      buildProductWriteInput(
        productBody({
          productType: "multi",
          variants: [
            variant("بزرگ", 1, Number.MAX_SAFE_INTEGER),
            variant("سرریز", 1, 1),
          ],
        }),
        { mode: "create" },
      ),
    ProductInputValidationError,
  );
});

test("multi product stock is derived from variants and ignores parent input", () => {
  const result = buildProductWriteInput(
    productBody({
      productType: "multi",
      stock: 999_999,
      variants: [variant("الف", 10, 2), variant("ب", 20, 7)],
    }),
    { mode: "create" },
  );
  assert.equal(result.productData.stock, 9);
});

test("Product foundation defaults are inactive and revisions start at zero", async () => {
  const document = new Product({
    ...buildProductWriteInput(productBody(), { mode: "create" }).productData,
    sku: "DEFAULTS-SKU",
    category: new mongoose.Types.ObjectId(),
  });
  await document.validate();

  assert.equal(document.catalogRevision, 0);
  assert.equal(document.inventoryVersion, 0);
  assert.equal(document.deletedAt, null);
});

test("CatalogChange declares a unique indexed deterministic sequence", () => {
  const source = readFileSync(
    new URL("./model/CatalogChange.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /sequence:\s*\{[\s\S]*?unique:\s*true,[\s\S]*?index:\s*true,/,
  );
  assert.match(source, /allocateCatalogChangeSequence\(session\)/);
});

test("InventoryOperation has a unique operationId and classifies replay versus conflict", () => {
  const operationId = InventoryOperation.schema.path("operationId");
  assert.equal(operationId.options.unique, true);
  assert.equal(operationId.options.index, true);
  assert.equal(classifyInventoryOperationReplay("same", "same"), "replay");
  assert.equal(classifyInventoryOperationReplay("first", "second"), "conflict");
});

test("InventoryOperation validates its hash and required payload", async () => {
  const valid = new InventoryOperation({
    operationId: "operation-1",
    deviceId: "device-1",
    requestHash: "a".repeat(64),
    payload: { deltas: [] },
  });
  await valid.validate();

  const invalid = new InventoryOperation({
    operationId: "operation-2",
    deviceId: "device-1",
    requestHash: "not-a-sha256",
  });
  await assert.rejects(() => invalid.validate(), /payload|required|requestHash/i);
});

test("PosDevice accepts declared scopes and enforces revocation state", async () => {
  const active = new PosDevice({
    deviceId: "device-1",
    credential: {
      publicKey: "test-public-key-metadata-only",
      algorithm: "Ed25519",
      keyId: "key-1",
    },
    scopes: ["catalog:read", "inventory:write", "sync:read"],
    environment: "test",
  });
  await active.validate();

  const invalidScope = new PosDevice({
    deviceId: "device-2",
    credential: {
      publicKey: "test-public-key-metadata-only",
      algorithm: "Ed25519",
      keyId: "key-2",
    },
    scopes: ["admin:write"],
    environment: "test",
  });
  await assert.rejects(() => invalidScope.validate(), /admin:write|scopes/i);

  const revokedWithoutTimestamp = new PosDevice({
    deviceId: "device-3",
    credential: {
      publicKey: "test-public-key-metadata-only",
      algorithm: "Ed25519",
      keyId: "key-3",
    },
    status: "revoked",
    scopes: ["catalog:read"],
    environment: "test",
  });
  await assert.rejects(
    () => revokedWithoutTimestamp.validate(),
    /revokedAt|revocation/i,
  );
});
