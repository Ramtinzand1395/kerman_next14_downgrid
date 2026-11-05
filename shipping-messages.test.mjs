import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as shipping from "./lib/shipping.ts";

const require = createRequire(import.meta.url);
const address = { province: "کرمان", city: "کرمان", postalCode: "7616912345" };
const oldDescription = "ارسال سفارش در محدوده تحت پوشش شهر کرمان با هزینه ثابت ۱۵۰٬۰۰۰ تومان انجام می‌شود.";
function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => Object.hasOwn(deps, name) ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
function harness() {
  let stored = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
  stored.localDelivery.feeToman = 120000;
  stored.localDelivery.description = oldDescription;
  let writes = 0;
  const model = {
    findOne: () => ({ lean: async () => structuredClone(stored) }),
    findOneAndUpdate: async (_filter, update) => { writes++; stored = { ...stored, ...structuredClone(update.$set) }; return structuredClone(stored); },
  };
  const settings = load("./lib/shippingSettings.ts", {
    "@/lib/shipping": shipping, "@/model/StoreShippingSettings": model, "@/lib/mongodb": async () => {},
  });
  const route = load("./app/api/admin/shipping-settings/route.ts", {
    "@/lib/shipping": shipping, "@/model/StoreShippingSettings": model, "@/lib/shippingSettings": settings,
    "@/lib/loyalty/api": {
      requireAdmin: async () => ({ userId: "a".repeat(24) }),
      ok: (data) => Response.json({ ok: true, data }),
      fail: (error, status) => Response.json({ ok: false, error }, { status }),
    },
  });
  return { route, settings, get stored() { return stored; }, get writes() { return writes; } };
}

test("stored legacy shipping copy cannot disagree with the numeric dashboard fee", async () => {
  const h = harness();
  const current = await h.settings.getStoreShippingSettings();
  assert.equal(current.localDelivery.description, shipping.formatLocalShippingPolicyText(120000));
  assert.equal(current.localDelivery.feeToman, 120000);
  assert.equal(h.writes, 0, "reads do not migrate production records");
});

test("checkout shipping descriptions use the fee even if the caller supplied stale copy", () => {
  const settings = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
  settings.localDelivery.feeToman = 120000;
  settings.localDelivery.description = oldDescription;
  const method = shipping.calculateShippingInfo(address, "kerman_local", settings);
  assert.equal(method.feeToman, 120000);
  assert.equal(method.description, shipping.formatLocalShippingPolicyText(120000));
});

test("actual dashboard save/read roundtrip keeps the fee and generated copy synchronized", async () => {
  const h = harness();
  for (const fee of [120000, 175000, 210000]) {
    const body = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
    body.localDelivery.feeToman = fee;
    body.localDelivery.description = oldDescription;
    const response = await h.route.PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) }));
    assert.equal(response.status, 200);
    assert.equal(h.stored.localDelivery.feeToman, fee);
    assert.equal(h.stored.localDelivery.description, shipping.formatLocalShippingPolicyText(fee));
    const saved = (await response.json()).data;
    const reloaded = (await (await h.route.GET()).json()).data;
    assert.deepEqual(saved, reloaded);
    const method = shipping.calculateShippingInfo(address, "kerman_local", reloaded);
    assert.equal(method.label, `${fee.toLocaleString("fa-IR")} تومان`);
    assert.equal(method.feeToman, fee);
  }
});

test("dashboard rejects invalid fees without writing and old orders retain their agreed fee", async () => {
  const h = harness();
  for (const fee of [0, -1, 1.5, 100000001]) {
    const body = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
    body.localDelivery.feeToman = fee;
    assert.equal((await h.route.PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) }))).status, 422);
  }
  assert.equal(h.writes, 0);
  const settings = await h.settings.getStoreShippingSettings();
  const snapshot = shipping.createOrderShippingSnapshot(shipping.calculateShippingInfo(address, "kerman_local", settings), address);
  settings.localDelivery.feeToman = 210000;
  assert.equal(shipping.formatOrderShippingDisplay({ shipping: snapshot }).feeToman, 120000);
});

test("dashboard can save its fee without a separately editable price description", async () => {
  const h = harness();
  const body = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
  body.localDelivery.feeToman = 175000;
  delete body.localDelivery.description;
  assert.equal((await h.route.PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) }))).status, 200);
  assert.equal(h.stored.localDelivery.feeToman, 175000);
  assert.equal(h.stored.localDelivery.description, shipping.formatLocalShippingPolicyText(175000));
});

test("actual checkout shipping API and public policy page follow subsequent dashboard price changes", async () => {
  const h = harness();
  const publicApi = load("./app/api/shipping/route.ts", {
    "@/lib/shipping": shipping, "@/lib/shippingSettings": h.settings,
    "@/model/Address": { findOne: () => ({ lean: async () => address }) },
    "@/lib/loyalty/api": {
      requireUser: async () => ({ userId: "a".repeat(24) }),
      ok: (data) => Response.json({ ok: true, data }),
      fail: (error, status) => Response.json({ ok: false, error }, { status }),
    },
  });
  const Terms = load("./app/(public)/terms/page.tsx", {
    "@/app/components/navigation/NavigationFeedback": () => null,
    "@/lib/shipping": shipping, "@/lib/shippingSettings": h.settings,
    "@/lib/site": { SITE_URL: "https://kermanatari.ir" },
    "@/lib/merchantSchema": load("./lib/merchantSchema.ts"),
  }).default;
  function visibleText(element) {
    if (Array.isArray(element)) return element.map(visibleText).join(" ");
    if (typeof element === "string" || typeof element === "number") return String(element);
    return element?.props ? visibleText(element.props.children) : "";
  }
  for (const fee of [120000, 175000]) {
    if (fee !== 120000) {
      const body = structuredClone(shipping.DEFAULT_SHIPPING_SETTINGS);
      body.localDelivery.feeToman = fee;
      assert.equal((await h.route.PATCH(new Request("https://example.test", { method: "PATCH", body: JSON.stringify(body) }))).status, 200);
    }
    const { NextRequest } = require("next/server");
    const response = await publicApi.GET(new NextRequest(`https://example.test/api/shipping?addressId=${"a".repeat(24)}`));
    const local = (await response.json()).data.options.find((option) => option.method === "kerman_local");
    assert.equal(local.feeToman, fee);
    assert.equal(local.description, shipping.formatLocalShippingPolicyText(fee));
    const text = visibleText(await Terms());
    assert.equal(text.split(shipping.formatLocalShippingPolicyText(fee)).length - 1, 1);
    assert.equal(text.includes("۱۵۰٬۰۰۰"), false);
  }
});
