import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Types } from "mongoose";

import {
  getRelatedProducts,
  parseRelatedProductsResponse,
} from "./lib/relatedProducts.ts";
import {
  MAX_RELATED_PRODUCTS,
  buildRelatedProductsPipeline,
  createRelatedProductSelection,
  isValidRelatedProductId,
} from "./lib/relatedProductQuery.ts";

const ids = {
  current: "66f123456789abcdef123400",
  category: "66f123456789abcdef123401",
  otherCategory: "66f123456789abcdef123402",
  tagA: "66f123456789abcdef123410",
  tagB: "66f123456789abcdef123411",
  tagC: "66f123456789abcdef123412",
};

function oid(value) {
  return new Types.ObjectId(value);
}

function idString(value) {
  return value.toHexString();
}

function runSelectionStages(pipeline, documents) {
  const firstMatch = pipeline[0].$match;
  const scoreStage = pipeline[1].$set.sharedTagCount;
  const sourceTagIds = scoreStage.$size.$setIntersection[1].map(idString);
  const sourceTagSet = new Set(sourceTagIds);
  const sort = pipeline[3].$sort;
  const limit = pipeline[4].$limit;

  return documents
    .filter((document) => {
      if (idString(document._id) === idString(firstMatch._id.$ne)) return false;
      if (document.status !== firstMatch.status) return false;
      if (document.deletedAt !== null && document.deletedAt !== undefined) {
        return false;
      }
      if (
        firstMatch.category &&
        idString(document.category) !== idString(firstMatch.category)
      ) {
        return false;
      }
      return document.tags.some((tag) => sourceTagSet.has(idString(tag)));
    })
    .map((document) => ({
      ...document,
      sharedTagCount: new Set(
        document.tags.map(idString).filter((tag) => sourceTagSet.has(tag)),
      ).size,
    }))
    .filter((document) => document.sharedTagCount > 0)
    .sort((left, right) => {
      const scoreOrder =
        (left.sharedTagCount - right.sharedTagCount) * sort.sharedTagCount;
      if (scoreOrder !== 0) return scoreOrder;

      const dateOrder =
        (left.createdAt.getTime() - right.createdAt.getTime()) * sort.createdAt;
      if (dateOrder !== 0) return dateOrder;

      return idString(left._id).localeCompare(idString(right._id)) * sort._id;
    })
    .slice(0, limit);
}

function product(overrides = {}) {
  return {
    _id: oid("66f123456789abcdef123420"),
    title: "محصول نمونه",
    slug: "sample-product",
    mainImage: "https://example.test/product.jpg",
    price: 1_500_000,
    discountPrice: null,
    status: "published",
    deletedAt: null,
    category: oid(ids.category),
    tags: [oid(ids.tagA)],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("summary API cards are accepted without full product-detail fields", async () => {
  const summary = {
    _id: ids.current,
    title: "تابلو تیکن",
    slug: "tekken-wall-art",
    mainImage: "https://example.test/tekken.jpg",
    price: 2_000_000,
    discountPrice: 1_800_000,
  };
  let receivedInit;

  const result = await getRelatedProducts(
    "https://example.test/api/products/related/id",
    async (_url, init) => {
      receivedInit = init;
      return new Response(JSON.stringify({ relatedProducts: [summary] }));
    },
  );

  assert.deepEqual(result.relatedProducts, [summary]);
  assert.equal(receivedInit.cache, "no-store");
  assert.equal("stock" in result.relatedProducts[0], false);
  assert.equal("comments" in result.relatedProducts[0], false);
});

test("one malformed card does not remove valid related-product cards", () => {
  const valid = {
    _id: ids.current,
    title: "محصول سالم",
    slug: "valid-product",
    mainImage: "https://example.test/valid.jpg",
    price: 0,
    discountPrice: null,
  };
  const malformed = { ...valid, _id: "", price: Number.MAX_SAFE_INTEGER + 1 };

  assert.deepEqual(
    parseRelatedProductsResponse({ relatedProducts: [malformed, valid] }),
    { relatedProducts: [valid] },
  );
});

test("related-product service failures never escape to the product page", async (t) => {
  await t.test("network failure", async () => {
    const result = await getRelatedProducts("https://example.test", async () => {
      throw new Error("offline");
    });
    assert.deepEqual(result, { relatedProducts: [] });
  });

  await t.test("non-success response", async () => {
    const result = await getRelatedProducts(
      "https://example.test",
      async () => new Response("no", { status: 503 }),
    );
    assert.deepEqual(result, { relatedProducts: [] });
  });

  await t.test("invalid JSON", async () => {
    const result = await getRelatedProducts(
      "https://example.test",
      async () => new Response("not-json"),
    );
    assert.deepEqual(result, { relatedProducts: [] });
  });

  await t.test("invalid response shape", async () => {
    const result = await getRelatedProducts(
      "https://example.test",
      async () => new Response(JSON.stringify({ products: [] })),
    );
    assert.deepEqual(result, { relatedProducts: [] });
  });
});

test("database selection ranks shared unique tags and excludes ineligible products", () => {
  const selection = createRelatedProductSelection(ids.current, {
    category: oid(ids.category),
    tags: [oid(ids.tagA), oid(ids.tagA), oid(ids.tagB)],
  });
  assert.ok(selection);
  assert.equal(selection.tagIds.length, 2, "source tags must be deduplicated");

  const pipeline = buildRelatedProductsPipeline(selection);
  const candidates = [
    product({
      _id: oid("66f123456789abcdef123421"),
      title: "دو تگ مشترک",
      tags: [oid(ids.tagA), oid(ids.tagB)],
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    }),
    product({
      _id: oid("66f123456789abcdef123422"),
      title: "یک تگ مشترک جدیدتر",
      tags: [oid(ids.tagA)],
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    }),
    product({
      _id: oid("66f123456789abcdef123423"),
      title: "تگ تکراری",
      tags: [oid(ids.tagA), oid(ids.tagA)],
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    }),
    product({ _id: oid(ids.current), title: "محصول فعلی" }),
    product({
      _id: oid("66f123456789abcdef123424"),
      title: "پیش‌نویس",
      status: "draft",
    }),
    product({
      _id: oid("66f123456789abcdef123425"),
      title: "حذف‌شده",
      deletedAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    product({
      _id: oid("66f123456789abcdef123426"),
      title: "بدون تگ مشترک",
      tags: [oid(ids.tagC)],
    }),
    product({
      _id: oid("66f123456789abcdef123427"),
      title: "دسته متفاوت",
      category: oid(ids.otherCategory),
    }),
  ];

  const results = runSelectionStages(pipeline, candidates);

  assert.deepEqual(
    results.map((item) => item.title),
    ["دو تگ مشترک", "یک تگ مشترک جدیدتر", "تگ تکراری"],
  );
  assert.equal(results[2].sharedTagCount, 1, "duplicate tags add no score");
});

test("a product without valid tags and a query without overlap return no result", () => {
  assert.equal(
    createRelatedProductSelection(ids.current, {
      category: oid(ids.category),
      tags: [],
    }),
    null,
  );

  const selection = createRelatedProductSelection(ids.current, {
    category: oid(ids.category),
    tags: [oid(ids.tagA)],
  });
  assert.ok(selection);
  const results = runSelectionStages(buildRelatedProductsPipeline(selection), [
    product({ tags: [oid(ids.tagC)] }),
  ]);
  assert.deepEqual(results, []);
});

test("related-product IDs accept only exact ObjectId hex strings", () => {
  assert.equal(isValidRelatedProductId(ids.current), true);
  assert.equal(isValidRelatedProductId("short-id"), false);
  assert.equal(isValidRelatedProductId("z".repeat(24)), false);
});

test("equal scores have stable ordering and the database limit is four", () => {
  const selection = createRelatedProductSelection(ids.current, {
    category: oid(ids.category),
    tags: [oid(ids.tagA)],
  });
  assert.ok(selection);
  const createdAt = new Date("2026-06-01T00:00:00.000Z");
  const candidates = [5, 2, 6, 1, 4, 3].map((suffix) =>
    product({
      _id: oid(`66f123456789abcdef12343${suffix}`),
      createdAt,
    }),
  );

  const pipeline = buildRelatedProductsPipeline(selection);
  const results = runSelectionStages(pipeline, candidates);

  assert.equal(results.length, MAX_RELATED_PRODUCTS);
  assert.deepEqual(
    results.map((item) => idString(item._id)),
    [1, 2, 3, 4].map((suffix) => `66f123456789abcdef12343${suffix}`),
  );
  assert.ok(
    pipeline.findIndex((stage) => "$limit" in stage) <
      pipeline.findIndex(
        (stage) => "$set" in stage && "cardActiveVariants" in stage.$set,
      ),
    "variant pricing must run only after the database limit",
  );
  assert.deepEqual(pipeline.at(-1).$project, {
    _id: 1,
    title: 1,
    slug: 1,
    mainImage: 1,
    price: "$cardPrice",
    discountPrice: "$cardDiscountPrice",
  });
});

test("route and page keep explicit no-store and published/deleted safeguards", async () => {
  const [routeSource, pageSource] = await Promise.all([
    readFile("app/api/products/related/[id]/route.ts", "utf8"),
    readFile("app/(public)/product/[slug]/page.tsx", "utf8"),
  ]);

  assert.match(routeSource, /export const dynamic = "force-dynamic"/);
  assert.match(routeSource, /export const revalidate = 0/);
  assert.match(routeSource, /"Cache-Control": "no-store, max-age=0"/);
  assert.match(routeSource, /status: "published"/);
  assert.match(routeSource, /deletedAt: null/);
  assert.match(routeSource, /isValidRelatedProductId\(id\)/);
  assert.match(pageSource, /loadRelatedProducts/);
  assert.match(pageSource, /relatedProducts\.map\(\(item: RelatedProduct\)/);
  assert.match(pageSource, /محصول مرتبطی پیدا نشد/);
});
