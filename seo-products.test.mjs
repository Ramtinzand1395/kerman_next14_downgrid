import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cartPath = new URL("./app/(public)/components/Cart.tsx", import.meta.url);
const productsPath = new URL("./app/(public)/products/page.tsx", import.meta.url);
const productPath = new URL("./app/(public)/product/[slug]/page.tsx", import.meta.url);
const sitePath = new URL("./lib/site.ts", import.meta.url);

test("product cards do not publish Product structured data", async () => {
  const source = await readFile(cartPath, "utf8");

  assert.doesNotMatch(source, /itemScope|itemType|itemProp/);
  assert.doesNotMatch(source, /application\/ld\+json/);
  assert.doesNotMatch(source, /kermanatari\.com/);
});

test("products listing keeps CollectionPage and ItemList URLs", async () => {
  const source = await readFile(productsPath, "utf8");

  assert.match(source, /"@type": "CollectionPage"/);
  assert.match(source, /"@type": "ItemList"/);
  assert.match(source, /url: toAbsoluteUrl\("\/products"\)/);
  assert.match(source, /url: toAbsoluteUrl\(`\/product\/\$\{product\.slug\}`\)/);
  assert.doesNotMatch(source, /"@type": "Product"/);
});

test("product detail keeps Product offers with exact IRR conversion", async () => {
  const source = await readFile(productPath, "utf8");

  assert.match(source, /"@type": "Product"/);
  assert.match(source, /"@type": "Offer"/);
  assert.match(source, /priceCurrency: "IRR"/);
  assert.match(source, /price: tomanToIrr\(finalPrice\)/);
  assert.match(source, /"@type": "AggregateOffer"/);
  assert.match(source, /lowPrice: minPriceInIRR/);
  assert.match(source, /highPrice: maxPriceInIRR/);
  assert.match(source, /tomanToIrr\(Number\(\(v\.discountPrice \?\? v\.price\) \|\| 0\)\)/);
  assert.match(source, /url: productUrl/);
});

test("structured-data URL helper defaults to the canonical .ir domain", async () => {
  const source = await readFile(sitePath, "utf8");

  assert.match(source, /DEFAULT_SITE_URL = "https:\/\/kermanatari\.ir"/);
  assert.doesNotMatch(source, /kermanatari\.com/);
});
