import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync(
  new URL("./app/(public)/components/landing/LandingHome.tsx", import.meta.url),
  "utf8",
);
const catalog = readFileSync(
  new URL("./app/(public)/used-consoles/page.tsx", import.meta.url),
  "utf8",
);

test("used-console home feature has a dedicated link, while the general console section has no duplicate used-console link", () => {
  const homeFeature = home.slice(
    home.indexOf('aria-labelledby="used-consoles-home-heading"'),
    home.indexOf('<LandingSpecialOffers', home.indexOf('aria-labelledby="used-consoles-home-heading"')),
  );
  assert.match(homeFeature, /href="\/used-consoles"/);
  assert.match(homeFeature, /عکس واقعی دستگاه/);
  assert.match(homeFeature, /گزارش تست/);
  assert.doesNotMatch(homeFeature, /data\.consoles\.find/);
  assert.match(homeFeature, /featuredUsedConsole/);
  assert.match(homeFeature, /lineHeight: 1\.65/);

  const generalConsoleSection = home.slice(
    home.indexOf('aria-labelledby="console-heading"'),
    home.indexOf('<ServiceOrderSection', home.indexOf('aria-labelledby="console-heading"')),
  );
  assert.doesNotMatch(generalConsoleSection, /href="\/used-consoles"/);
  assert.match(generalConsoleSection, /href="\/category\/consoles"/);
});

test("used-console page retains live catalog filtering, product links and essential SEO markup", () => {
  assert.match(catalog, /getCategoryProducts\(/);
  assert.match(catalog, /used: true/);
  assert.match(catalog, /exactCategories: true/);
  assert.match(catalog, /name="generation"/);
  assert.match(catalog, /name="min"/);
  assert.match(catalog, /name="max"/);
  assert.match(catalog, /name="inStock"/);
  assert.match(catalog, /<Cart key=\{product\._id\} game=\{product\}/);
  assert.match(catalog, /alternates: \{ canonical \}/);
  assert.match(catalog, /BreadcrumbList/);
  assert.match(catalog, /ItemList/);
  assert.match(catalog, /سؤال‌های رایج درباره خرید کنسول کارکرده/);
});


test("homepage loads only real available used consoles and admin keeps automatic tags", () => {
  const data = readFileSync(new URL("./lib/landing-data.ts", import.meta.url), "utf8");
  const drawer = readFileSync(new URL("./app/(dashboard)/dashboard/components/drawers/AddProductDrawer.tsx", import.meta.url), "utf8");
  assert.match(data, /usedConsoleCategoryIds = categories\.filter\(\(category\) => isConsoleGeneration\(category\.slug\)\)/);
  assert.match(data, /productQuery\(usedConsoleCategoryIds, 4, \{ condition: "used", productType: "single"/);
  assert.match(drawer, /tags: syncUsedConsoleTags\(prev\.tags, tagsList, slug\)\.tagIds/);
  assert.match(drawer, /lockedTagIds=\{automaticTags\?\.lockedIds\}/);
});
