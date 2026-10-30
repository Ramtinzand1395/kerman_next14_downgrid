import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as selector from "./lib/variantSelector.ts";

const require = createRequire(import.meta.url);
// Exercise the actual client components during their initial server render.
function loadComponent(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) => dependencies[name] ?? require(name), module, module.exports,
  );
  return module.exports;
}
const context = loadComponent("./app/(public)/product/[slug]/ProductVariantContext.tsx", {
  "@/lib/variantSelector": selector,
});
const { default: CustomVariantSelector } = loadComponent("./app/(public)/product/[slug]/CustomVariantSelector.tsx", {
  "@/lib/variantSelector": selector,
  "./ProductVariantContext": context,
});
const variants = [
  { _id: "expensive", title: "قاب بزرگ", price: 800, discountPrice: 250, stock: 2, isActive: true },
  { _id: "cheap", title: "شاسی کوچک", price: 400, discountPrice: null, stock: 1, isActive: true },
  { _id: "inactive", title: "غیرفعال", price: 1, stock: 2, isActive: false },
];
const config = {
  enabled: true, version: 1,
  groups: [
    { id: "frame", key: "frame", label: "نوع فریم", displayType: "dropdown", order: 0, required: true,
      options: [{ id: "framed", label: "قاب", order: 0 }, { id: "mounted", label: "شاسی", order: 1 }] },
    { id: "size", key: "size", label: "اندازه", displayType: "dropdown", order: 1, required: true,
      options: [{ id: "large", label: "بزرگ", order: 0 }, { id: "small", label: "کوچک", order: 1 }] },
  ],
  mappings: [
    { variantId: "expensive", optionIds: { frame: "framed", size: "large" } },
    { variantId: "cheap", optionIds: { frame: "mounted", size: "small" } },
  ],
};
function Summary() {
  const value = context.useProductVariant();
  return React.createElement("output", null, JSON.stringify({
    id: value.selectedVariantId, price: value.finalPrice,
    stock: value.effectiveStock, requiresSelection: value.requiresSelection,
  }));
}
function renderProduct(overrides = {}, initialVariantId) {
  return renderToStaticMarkup(React.createElement(context.ProductVariantProvider, {
    product: { _id: "product", productType: "multi", variants, price: 400, stock: 3,
      defaultVariantId: "cheap", variantSelector: config, ...overrides }, initialVariantId,
  }, React.createElement(Summary), overrides.variantSelector === undefined
    ? React.createElement(CustomVariantSelector) : null));
}

test("initial page selects the lowest discounted model and both dependent dropdowns", () => {
  const html = renderProduct();
  assert.match(html, /&quot;id&quot;:&quot;expensive&quot;/);
  assert.match(html, /&quot;price&quot;:250/);
  assert.match(html, /&quot;requiresSelection&quot;:false/);
  assert.match(html, /value="framed" selected=""/);
  assert.match(html, /value="large" selected=""/);
  assert.equal(renderProduct(), html); // A fresh visit needs no saved admin selection.
});
test("legacy multi-products also ignore the stored default and variant ordering", () => {
  const html = renderProduct({ variantSelector: null, variants: [...variants].reverse() });
  assert.match(html, /&quot;id&quot;:&quot;expensive&quot;/);
});
test("a customer's explicit variant link remains selected", () => {
  const html = renderProduct({}, "cheap");
  assert.match(html, /&quot;id&quot;:&quot;cheap&quot;/);
  assert.match(html, /value="mounted" selected=""/);
  assert.match(html, /value="small" selected=""/);
});
test("unavailable cheapest model stays selected with its exact stock", () => {
  const html = renderProduct({ variants: variants.map(v => ({ ...v, stock: v._id === "expensive" ? 0 : 5 })) });
  assert.match(html, /&quot;id&quot;:&quot;expensive&quot;/);
  assert.match(html, /&quot;stock&quot;:0/);
  assert.match(html, /این ترکیب در حال حاضر ناموجود است/);
});
test("inactive and unmapped variants cannot become defaults or URL selections", () => {
  const mapped = { ...config, mappings: config.mappings.slice(1) };
  assert.equal(selector.getDefaultVariant(variants, mapped, "expensive")._id, "cheap");
  assert.equal(selector.getDefaultVariant(variants, undefined, "inactive")._id, "expensive");
  assert.equal(selector.getDefaultVariant(variants, config, "missing")._id, "expensive");
});
test("ties are stable, zero discounts are supported, and invalid prices are skipped", () => {
  assert.equal(selector.getDefaultVariant([
    { ...variants[0], discountPrice: NaN },
    { ...variants[1], discountPrice: 0 },
    { ...variants[0], discountPrice: 0 },
  ])._id, "cheap");
  assert.equal(selector.getDefaultVariant([]), undefined);
  assert.equal(selector.getDefaultVariant([variants[2]]), undefined);
});
test("single products keep their own price and require no variant", () => {
  const html = renderProduct({ productType: "single", variantSelector: null, price: 123 });
  assert.match(html, /&quot;id&quot;:&quot;&quot;/);
  assert.match(html, /&quot;price&quot;:123/);
  assert.match(html, /&quot;requiresSelection&quot;:false/);
});
