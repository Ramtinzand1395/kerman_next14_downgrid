import test from "node:test";
import assert from "node:assert/strict";
import "./scripts/pos-test-loader.mjs";
const { buildProductWriteInput } = await import("./lib/productInput.ts");
import { consoleChecks } from "./lib/used-console.ts";
import { mapCatalogProduct } from "./lib/pos/catalog.ts";

const options = { mode: "create", categorySlug: "playstation-2" };
const base = { title: "PS2", slug: "test-ps2", mainImage: "/test.webp", price: 100, purchasePrice: 50, stock: 1 };
const report = {
  model: "PS2 Slim", appearance: "خط روی درب", repairHistory: "نامشخص",
  accessories: "یک دسته", terms: "شرایط نمونه", testedOn: "2026-11-20",
  checks: Object.fromEntries(consoleChecks["playstation-2"].map(key => [key, "تست نشده"])),
};
const body = { ...base, condition: "used", usedConsole: report, status: "published" };
const write = (input, context = options) => buildProductWriteInput(input, context).productData;

test("legacy condition is unspecified and used reports round-trip for older editors", () => {
  assert.equal(write(base).condition, undefined);
  assert.deepEqual(write(body).usedConsole.checks, report.checks);
  assert.deepEqual(write({ ...base, status: "published" }, {
    ...options, mode: "update", previousCondition: "used", previousReport: report,
  }).usedConsole.checks, report.checks);
  assert.equal(write({ ...body, condition: "new" }).usedConsole, null);
});
test("draft reports can be incomplete; publication validates each generation and visible defects", () => {
  const draft = write({ ...body, status: "draft", usedConsole: {}, mainImage: "" });
  assert.ok(draft.usedConsole);
  assert.equal(draft.mainImage, "");
  assert.throws(() => write({ ...body, mainImage: "" }));
  for (const change of [{ usedConsole: {} }, { stock: 2 }, { isDigital: true }, { condition: "other" },
    { usedConsole: { ...report, testedOn: "2026-02-31" } },
    { usedConsole: { ...report, checks: { ...report.checks, "دسته": "ایراد دارد" } } }]) {
    assert.throws(() => write({ ...body, ...change }));
  }
  assert.throws(() => write(body, { ...options, categorySlug: "accessories" }));
  for (const [generation, labels] of Object.entries(consoleChecks)) {
    const checks = Object.fromEntries(labels.map(label => [label, "سالم"]));
    assert.deepEqual(write({ ...body, usedConsole: { ...report, checks } }, { ...options, categorySlug: generation }).usedConsole.checks, checks);
  }
});
test("all product drafts may omit images while publication still requires one", () => {
  const regular = { ...base, mainImage: "", status: "draft" };
  assert.equal(write(regular).mainImage, "");
  assert.throws(() => write({ ...regular, status: "published" }));
});
test("online confirmation flag in the POS catalog is specific to used units", () => {
  assert.equal(mapCatalogProduct({ _id: "1", ...body }).requiresOnlineSale, true);
  assert.equal(mapCatalogProduct({ _id: "1", ...base }).requiresOnlineSale, undefined);
});
