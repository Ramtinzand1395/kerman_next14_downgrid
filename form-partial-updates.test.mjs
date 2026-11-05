import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = "a".repeat(24);
function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => {
    if (Object.hasOwn(deps, name)) return deps[name];
    if (name === "@/types/loyalty") return load("./types/loyalty.ts");
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const schemas = load("./validations/loyalty.validation.ts");
const api = load("./lib/loyalty/api.ts", {
  "next-auth": { getServerSession: async () => ({ user: { id, role: "superadmin" } }) },
  "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
  "@/lib/mongodb": async () => {},
  "@/lib/dashboard-access": load("./lib/dashboard-access.ts"),
});
const families = [
  { name: "spin", schema: "spinPrize", model: "SpinPrize", module: "SpinHistory", stored: { value: 75000, order: 8, weight: 5 },
    create: { title: "اعتبار هدیه", type: "wallet_credit", weight: 5 }, defaults: { value: 0, isActive: true, order: 0 } },
  { name: "achievements", schema: "achievement", model: "Achievement", stored: { xpReward: 500, order: 3 },
    create: { code: "three_orders", title: "سه خرید", metric: "purchase_count", target: 3 }, defaults: { xpReward: 0, order: 0, isActive: true } },
  { name: "cashback", schema: "cashbackRule", model: "CashbackRule", stored: { minOrderAmount: 200000, vipTiers: ["gold"], categories: [id], priority: 9 },
    create: { title: "کش‌بک ویژه", percent: 5 }, defaults: { minOrderAmount: 0, vipTiers: [], categories: [], priority: 0, isActive: true } },
  { name: "campaigns", schema: "campaign", model: "Campaign", stored: { xpMultiplier: 3, participationXp: 500, vipEarlyAccessHours: 24 },
    create: { title: "کمپین ویژه", startsAt: "2026-11-01", endsAt: "2026-11-30" }, defaults: { xpMultiplier: 1, participationXp: 0, vipEarlyAccessHours: 0, isActive: true } },
  { name: "missions", schema: "mission", model: "Mission", stored: { reward: { xp: 200, walletCredit: 50000, coupon: id } },
    create: { title: "سه خرید", period: "weekly", metric: "purchase_count", target: 3, reward: {} }, defaults: { reward: { xp: 0, walletCredit: 0 }, isActive: true } },
];

function applySet(record, values) {
  const result = structuredClone(record);
  for (const [key, value] of Object.entries(values)) {
    const parts = key.split(".");
    let target = result;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }
  return result;
}
function managementRoute(family, stored) {
  let update;
  const model = { findByIdAndUpdate: async (_id, value) => { update = value; return applySet(stored, value.$set); } };
  const route = load(`./app/api/admin/loyalty/${family.name}/[id]/route.ts`, {
    "@/lib/loyalty/api": api, "@/validations/loyalty.validation": schemas,
    [`@/model/Loyalty Club/${family.module ?? family.model}`]: family.module ? { [family.model]: model } : model,
  });
  return { patch: (body) => route.PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) }), get update() { return update; } };
}

for (const family of families) {
  test(`${family.name}: real update schema and PATCH preserve omitted values on status/title edits`, async () => {
    const schema = schemas[`${family.schema}UpdateSchema`];
    assert.deepEqual(schema.parse({}), {});
    for (const patch of [{ isActive: false }, { title: "عنوان جدید" }]) {
      assert.deepEqual(schema.parse(patch), patch);
      const stored = { ...family.stored, title: "عنوان فعلی", isActive: true };
      const h = managementRoute(family, stored);
      const response = await h.patch(patch);
      assert.equal(response.status, 200);
      assert.deepEqual(h.update, { $set: patch });
      assert.deepEqual((await response.json()).data, { ...stored, ...patch });
    }
  });
  test(`${family.name}: creation defaults remain available`, () => {
    const parsed = schemas[`${family.schema}Schema`].parse(family.create);
    for (const [key, value] of Object.entries(family.defaults)) assert.deepEqual(parsed[key], value);
  });
}

test("partial mission reward updates preserve the other rewards and attached coupon", async () => {
  const family = families.find((family) => family.name === "missions");
  const stored = { ...family.stored, isActive: false };
  const h = managementRoute(family, stored);
  const response = await h.patch({ reward: { xp: 25 } });
  assert.equal(response.status, 200);
  assert.deepEqual(h.update, { $set: { "reward.xp": 25 } });
  assert.deepEqual((await response.json()).data, { ...stored, reward: { ...stored.reward, xp: 25 } });
  assert.deepEqual(schemas.missionUpdateSchema.parse({ reward: {} }), { reward: {} });
});

test("explicit zero/false and empty restriction arrays still make the requested change", async () => {
  for (const [name, patch] of [["spin", { value: 0, order: 0 }], ["cashback", { categories: [], vipTiers: [], minOrderAmount: 0 }]]) {
    const family = families.find((family) => family.name === name);
    const h = managementRoute(family, { ...family.stored, isActive: false });
    assert.equal((await h.patch(patch)).status, 200);
    assert.deepEqual(h.update, { $set: patch });
  }
});

test("partial membership benefit updates preserve unedited benefits", async () => {
  const stored = { titleFa: "طلایی", benefits: { discountPercent: 8, xpMultiplier: 3, prioritySupport: true, cashbackBonusPercent: 5 } };
  let update;
  const route = load("./app/api/admin/loyalty/levels/route.ts", {
    "@/lib/loyalty/api": api, "@/validations/loyalty.validation": schemas,
    "@/model/Loyalty Club/MembershipLevel": { findOneAndUpdate: async (_filter, value) => { update = value; return applySet(stored, value.$set); } },
    "@/lib/loyalty/experience.service": { invalidateLevelsCache: () => {} },
    "@/lib/loyalty/seed": {},
  });
  const response = await route.PATCH(new Request("https://example.test", {
    method: "PATCH", body: JSON.stringify({ kind: "vip", code: "gold", benefits: { discountPercent: 0 } }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(update, { $set: { "benefits.discountPercent": 0 } });
  assert.deepEqual((await response.json()).data.benefits, { ...stored.benefits, discountPercent: 0 });
});

test("category SEO schema and real update handler preserve omitted SEO fields", async () => {
  const validation = load("./lib/catalog/category-input.ts");
  assert.deepEqual(validation.categorySeoInput.parse({ seoTitle: "عنوان" }), { seoTitle: "عنوان" });
  let update;
  const route = load("./app/api/admin/category/[id]/route.ts", {
    "@/lib/catalog/category-input": validation,
    "next-auth": { getServerSession: async () => ({ user: { role: "superadmin" } }) },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} }, "@/lib/mongodb": async () => {},
    "@/model/Category": { findByIdAndUpdate: (_id, value) => { update = value; return { lean: async () => ({ _id: id }) }; } },
    "@/model/Product": {}, "@/model/Loyalty Club/Coupon": {}, "@/model/Loyalty Club/CashbackRule": {},
  });
  assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify({ seoTitle: "عنوان" }) }), { params: { id } })).status, 200);
  assert.deepEqual(update, { $set: { seoTitle: "عنوان" } });
});

test("game edits preserve omitted size, price, storage and image fields", async () => {
  const validation = load("./lib/game-list-validation.ts");
  let update;
  const route = load("./app/api/admin/store-order/game-list/route.ts", {
    "@/lib/game-list-validation": validation,
    "next-auth": { getServerSession: async () => ({ user: { role: "superadmin" } }) },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} }, "@/lib/mongodb": async () => {},
    "@/model/GameList": { findOneAndUpdate: async (_filter, value) => { update = value; return { items: { id: () => ({}) } }; } },
  });
  assert.equal((await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify({ platform: "ps5", itemId: id, name: "New name" }) }))).status, 200);
  assert.deepEqual(update, { $set: { "items.$.name": "New name" } });
});

test("explicit empty SEO fields and nullable game values still clear only the requested fields", () => {
  const { categorySeoInput } = load("./lib/catalog/category-input.ts");
  assert.deepEqual(categorySeoInput.parse({ metaDescription: "", faqs: [] }), { metaDescription: "", faqs: [] });
  const { gameInput, gameUpdateInput } = load("./lib/game-list-validation.ts");
  const base = { platform: "ps5", name: "New name" };
  assert.deepEqual(gameUpdateInput.parse({ ...base, size: null, price: 0, storage: "" }), { ...base, size: null, price: 0, storage: null });
  assert.deepEqual(gameInput.parse(base), { ...base, size: null, price: null, storage: null });
});

test("partial updates retain validation and do not write invalid or operator-like payloads", async () => {
  for (const family of families) {
    const h = managementRoute(family, family.stored);
    assert.equal((await h.patch({ isActive: "false" })).status, 422);
    assert.equal(h.update, undefined);
  }
  for (const [schema, patch] of [
    [schemas.spinPrizeUpdateSchema, { value: -1 }],
    [schemas.missionUpdateSchema, { reward: { xp: -1 } }],
    [schemas.cashbackRuleUpdateSchema, { categories: ["bad-id"] }],
    [schemas.campaignUpdateSchema, { xpMultiplier: 11 }],
    [schemas.achievementUpdateSchema, { xpReward: -1 }],
  ]) assert.equal(schema.safeParse(patch).success, false);
  const h = managementRoute(families.find((family) => family.name === "missions"), { reward: { xp: 100, walletCredit: 200 } });
  assert.equal((await h.patch({ reward: { xp: 0, "$unset": "walletCredit", "coupon.$bad": id } })).status, 200);
  assert.deepEqual(h.update, { $set: { "reward.xp": 0 } });
});
