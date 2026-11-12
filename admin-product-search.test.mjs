import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import mongoose from "mongoose";
import ts from "typescript";
import Product from "./model/Product.ts";
import Category from "./model/Category.ts";
import Comment from "./model/Comment.ts";
import "./model/Tag.ts";
import { descendantIds } from "./lib/catalog/category-seo.ts";

const require = createRequire(import.meta.url);

test("admin product search filters the catalog before paginating in MongoDB", {
  skip: process.env.ADMIN_PRODUCT_LOCAL_MONGO_TESTS !== "true",
  timeout: 180_000,
}, async (t) => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: { ip: "127.0.0.1", args: ["--nounixsocket"] },
  });
  t.after(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      await mongo.stop();
    }
  });
  await mongoose.connect(mongo.getUri("admin_product_search_test"));

  const module = { exports: {} };
  const source = readFileSync(new URL("./app/api/admin/product/route.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  let session = null;
  const dependencies = {
    "@/lib/mongodb": async () => {},
    "@/model/Product": Product,
    "@/model/Category": Category,
    "@/model/Comment": Comment,
    "@/lib/catalog/category-seo": { descendantIds },
    "next-auth": { getServerSession: async () => session },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    // The write dependencies are unused by GET.
    "@/lib/catalogReferences": {},
    "@/lib/notifications/events": {},
    "@/lib/productInput": {},
    "@/lib/catalogIdentity": {},
    "@/lib/pos/catalog-identities": {},
    "@/lib/pos/catalog-outbox": {},
  };
  new Function("require", "module", "exports", outputText)(
    (name) => dependencies[name] ?? require(name),
    module,
    module.exports,
  );
  const { GET } = module.exports;
  const request = (params = {}) =>
    GET(new Request("https://kermanatari.ir/api/admin/product?" + new URLSearchParams(params)));
  const list = async (params) => {
    const response = await request(params);
    assert.equal(response.status, 200);
    return response.json();
  };

  assert.equal((await request()).status, 401);
  session = { user: { role: "admin" } };
  assert.equal((await request()).status, 403);
  session.user.role = "superadmin";
  assert.equal((await request({ category: "bad-id" })).status, 400);

  const parent = await Category.create({ name: "کنسول‌های بازی", slug: "consoles" });
  const child = await Category.create({ name: "پلی استیشن", slug: "playstation", parent: parent._id });
  const other = await Category.create({ name: "تابلو", slug: "wall-art" });
  const product = (slug, fields = {}) => ({
    slug,
    title: slug,
    mainImage: "/product.webp",
    category: child._id,
    price: 1_000,
    stock: 12,
    status: "published",
    createdAt: new Date(0),
    ...fields,
  });
  await Product.collection.insertMany([
    ...Array.from({ length: 12 }, (_, index) =>
      product(`assassin-${index}`, { title: `Assassin's Creed ${index}` }),
    ),
    ...Array.from({ length: 10 }, (_, index) =>
      product(`newer-${index}`, { category: other._id, createdAt: new Date(1000) }),
    ),
    product("assassin-deleted", { title: "Assassin's Creed", deletedAt: new Date() }),
    product("special", {
      title: "کارت [ویژه]",
      productType: "multi",
      variants: [{ title: "مدل اول", sku: "MODEL-007", barcode: "01234567" }],
      stock: 2,
      status: "draft",
    }),
    product("legacy", { stock: null, status: null }),
  ]);

  const defaultList = await list();
  assert.equal(defaultList.total, 24);
  assert.ok(defaultList.products.every((item) => item.slug.startsWith("newer-")));

  const search = { q: "aSs", includeStats: "false" };
  const first = await list(search);
  const second = await list({ ...search, page: "2" });
  assert.equal(first.total, 12);
  assert.equal(first.totalPages, 2);
  assert.equal(first.products.length, 10);
  assert.equal(second.products.length, 2);
  assert.equal(second.page, 2);
  assert.equal(new Set([...first.products, ...second.products].map((item) => item._id)).size, 12);
  assert.equal((await list({ ...search, page: "99" })).page, 2);
  assert.equal((await list({ ...search, page: "-1" })).page, 1);
  assert.equal("stats" in first, false);
  assert.equal((await list({ q: "ass" })).stats.total, 24);

  const filtered = await list({
    q: "كنسول های بازي",
    category: String(parent._id),
    stock: "low",
    status: "draft",
  });
  assert.deepEqual(filtered.products.map((item) => item.slug), ["special"]);
  assert.equal((await list({ category: String(other._id), q: "ass" })).total, 0);
  assert.equal((await list({ q: "ass", stock: "in", status: "published" })).total, 12);
  assert.deepEqual((await list({ stock: "out", status: "draft" })).products.map((item) => item.slug), ["legacy"]);

  for (const q of ["MODEL-۰۰۷", "۰۱۲۳۴۵۶۷", "كارت [ويژه]"]) {
    assert.deepEqual((await list({ q })).products.map((item) => item.slug), ["special"]);
  }
  const noMatches = await list({ q: ".*[", page: "3" });
  assert.equal(noMatches.total, 0);
  assert.equal(noMatches.page, 1);
  assert.equal(noMatches.totalPages, 1);
});
