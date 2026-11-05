import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = (digit) => digit.repeat(24);
function load(path, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "@/types/loyalty") return load("./types/loyalty.ts");
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const schemas = load("./validations/loyalty.validation.ts");
const targeting = load("./lib/loyalty/coupon-form.ts");
const policy = load("./lib/loyalty/coupon.policy.ts");
const categoryPolicy = load("./lib/catalog/category-seo.ts");

test("real coupon PATCH schema does not synthesize omitted restrictions or defaults", () => {
  assert.deepEqual(schemas.couponUpdateSchema.parse({ title: "عنوان جدید" }), { title: "عنوان جدید" });
  assert.deepEqual(schemas.couponUpdateSchema.parse({}), {});
});

test("explicit restriction replacements remain valid and malformed IDs fail", () => {
  const restrictions = { products: [id("1")], categories: [id("2")], allowedUsers: [id("3")] };
  assert.deepEqual(schemas.couponUpdateSchema.parse(restrictions), restrictions);
  for (const key of Object.keys(restrictions)) {
    assert.deepEqual(schemas.couponUpdateSchema.parse({ [key]: [] }), { [key]: [] });
    assert.equal(schemas.couponUpdateSchema.safeParse({ [key]: ["bad-id"] }).success, false);
  }
});

test("coupon creation keeps its defaults independently of PATCH", () => {
  const created = schemas.couponCreateSchema.parse({ code: "SETUP5", type: "percent", value: 5 });
  for (const key of ["products", "categories", "allowedUsers"]) assert.deepEqual(created[key], []);
  assert.equal(created.scope, "public");
  assert.equal(created.isActive, true);
  assert.equal(created.perUserLimit, 1);
});

test("actual PATCH handler preserves stored restrictions when editing ordinary form fields", async () => {
  const stored = { products: [id("1")], categories: [id("2")], allowedUsers: [id("3")], scope: "private", perUserLimit: 4, isActive: false };
  let update;
  const api = load("./lib/loyalty/api.ts", {
    "next-auth": { getServerSession: async () => ({ user: { id: id("4"), role: "superadmin" } }) },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/mongodb": async () => {},
    "@/lib/dashboard-access": load("./lib/dashboard-access.ts"),
  });
  const route = load("./app/api/admin/loyalty/coupons/[id]/route.ts", {
    "@/lib/loyalty/api": api,
    "@/validations/loyalty.validation": schemas,
    "@/model/PromotionModal": {},
    "@/model/Loyalty Club/Coupon": { findByIdAndUpdate: async (_id, value) => { update = value; return { ...stored, ...value.$set }; } },
  });
  const response = await route.PATCH(new Request("https://example.test", {
    method: "PATCH", body: JSON.stringify({ title: "ویرایش عنوان" }),
  }), { params: Promise.resolve({ id: id("5") }) });
  assert.equal(response.status, 200);
  assert.deepEqual(update, { $set: { title: "ویرایش عنوان" } });
  assert.deepEqual((await response.json()).data, { ...stored, title: "ویرایش عنوان" });
});

test("form preserves legacy restrictions, requires a category and only clears limits explicitly", () => {
  assert.equal(targeting.couponTargetMode({ products: [id("1")], categories: [id("2")] }), "preserve");
  assert.deepEqual(targeting.couponTargetPayload("preserve", []), {});
  assert.equal(targeting.couponTargetMode({ categories: [id("2")] }), "categories");
  assert.throws(() => targeting.couponTargetPayload("categories", []), /حداقل/);
  assert.deepEqual(targeting.couponTargetPayload("categories", [id("2"), id("2")]), { products: [], categories: [id("2")] });
  assert.deepEqual(targeting.couponTargetPayload("all", [id("2")]), { products: [], categories: [] });
});

function serviceHarness(changes = {}) {
  let categoryReads = 0;
  const coupon = {
    _id: id("9"), code: "SETUP5", type: "percent", value: 5,
    isActive: true, scope: "private", allowedUsers: [id("3")], minPurchaseAmount: 0,
    usedCount: 0, perUserLimit: 1, products: [], categories: [id("2")], ...changes,
  };
  const rows = [
    { _id: id("2"), parent: null },
    { _id: id("4"), parent: id("2") },
    { _id: id("5"), parent: id("4") },
    { _id: id("6"), parent: null },
  ];
  const service = load("./lib/loyalty/coupon.service.ts", {
    "@/model/Loyalty Club/Coupon": { findOne: async () => coupon },
    "@/model/Loyalty Club/CouponUsage": { countDocuments: async () => 0 },
    "@/model/Category": { find: () => { categoryReads++; return { select: () => ({ lean: async () => rows }) }; } },
    "./coupon.policy": policy,
    "@/lib/catalog/category-seo": categoryPolicy,
  });
  return { service, coupon, get categoryReads() { return categoryReads; } };
}

const validateInput = (items) => ({ code: "SETUP5", userId: id("3"), orderAmount: items.reduce((sum, line) => sum + line.amount, 0), items });
const line = (category, amount = 100000, productId = id("8")) => ({ productId, categoryIds: [id(category)], amount });

test("category-only percent discount excludes unrelated cart lines and includes descendants exactly once", async () => {
  const h = serviceHarness({ categories: [id("2"), id("4")] });
  const result = await h.service.validateCoupon(validateInput([line("2"), line("4"), line("5"), line("6", 900000)]));
  assert.equal(result.ok, true);
  assert.equal(result.discountAmount, 15000); // 5% of 300,000, not of the 1,200,000 cart.
  assert.equal(h.categoryReads, 1);
});

test("an unrelated cart or missing category evidence cannot use a restricted coupon", async () => {
  const h = serviceHarness();
  for (const items of [[line("6")], [{ productId: id("8"), amount: 100000 }], []]) {
    assert.equal((await h.service.validateCoupon(validateInput(items))).ok, false);
  }
});

test("subcategory selection excludes its parent and unrelated categories", async () => {
  const h = serviceHarness({ categories: [id("4")] });
  assert.equal((await h.service.validateCoupon(validateInput([line("2"), line("6")]))).ok, false);
  assert.equal((await h.service.validateCoupon(validateInput([line("5")]))).discountAmount, 5000);
});

test("fixed discounts and percentage caps never exceed the eligible line amount", async () => {
  const items = [line("4", 20000), line("6", 900000)];
  assert.equal((await serviceHarness({ type: "fixed", value: 100000 }).service.validateCoupon(validateInput(items))).discountAmount, 20000);
  assert.equal((await serviceHarness({ value: 50, maxDiscountAmount: 3000 }).service.validateCoupon(validateInput(items))).discountAmount, 3000);
});

test("private users and existing product exceptions retain their original semantics", async () => {
  const h = serviceHarness();
  assert.equal((await h.service.validateCoupon({ ...validateInput([line("2")]), userId: id("7") })).ok, false);
  assert.equal(h.categoryReads, 0);
  const legacy = serviceHarness({ products: [id("1")] });
  assert.equal((await legacy.service.validateCoupon(validateInput([line("6", 100000, id("1"))]))).discountAmount, 5000);
  const all = serviceHarness({ products: [], categories: [] });
  assert.equal((await all.service.validateCoupon(validateInput([line("6")]))).discountAmount, 5000);
  assert.equal(all.categoryReads, 0);
});

test("actual checkout preview ignores client category and amount claims", async () => {
  for (const [category, ok, discount] of [["6", false, undefined], ["4", true, 10000]]) {
    const h = serviceHarness();
    const route = load("./app/api/loyalty/coupon/validate/route.ts", {
      "next-auth": { getServerSession: async () => ({ user: { id: id("3") } }) },
      "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
      "@/lib/mongodb": async () => {},
      "@/model/Product": { find: () => ({ select: () => ({ lean: async () => [{ _id: id("8"), category: id(category), price: 200000 }] }) }) },
      "@/lib/loyalty/coupon.service": h.service,
    });
    const response = await route.POST(new Request("https://example.test", {
      method: "POST", body: JSON.stringify({ code: "SETUP5", items: [{ productId: id("8"), quantity: 1, categoryIds: [id("2")], amount: 1 }] }),
    }));
    const body = await response.json();
    assert.equal(body.ok, ok);
    assert.equal(body.discountAmount, discount);
    if (ok) assert.equal(body.totalPrice, 200000);
  }
});
