import test from "node:test";
import assert from "node:assert/strict";
import {
  VariantSelectorValidationError,
  getAvailableOptionIds,
  getVariantAttributeSelections,
  normalizeVariantSelector,
  resolveVariantId,
} from "./lib/variantSelector.ts";

const variants = [
  { _id: "66f123456789abcdef123451", title: "شاسی کوچک", price: 100, stock: 2, isActive: true },
  { _id: "66f123456789abcdef123452", title: "شاسی بزرگ", price: 200, stock: 0, isActive: true },
  { _id: "66f123456789abcdef123453", title: "تابلو بزرگ", price: 300, stock: 4, isActive: true },
];

const twoGroupConfig = {
  enabled: true,
  version: 1,
  groups: [
    {
      id: "type",
      key: "product-type",
      label: "نوع محصول",
      displayType: "chips",
      required: true,
      order: 0,
      options: [
        { id: "chassis", label: "شاسی", order: 0 },
        { id: "frame", label: "تابلو", order: 1 },
      ],
    },
    {
      id: "size",
      key: "size",
      label: "اندازه",
      displayType: "dropdown",
      required: true,
      order: 1,
      options: [
        { id: "small", label: "کوچک", order: 0 },
        { id: "large", label: "بزرگ", order: 1 },
      ],
    },
  ],
  mappings: [
    { variantId: variants[0]._id, optionIds: { type: "chassis", size: "small" } },
    { variantId: variants[1]._id, optionIds: { type: "chassis", size: "large" } },
    { variantId: variants[2]._id, optionIds: { type: "frame", size: "large" } },
  ],
};

test("single-group selection resolves one existing variant", () => {
  const config = normalizeVariantSelector(
    {
      enabled: true,
      version: 1,
      groups: [twoGroupConfig.groups[0]],
      mappings: [
        { variantId: variants[0]._id, optionIds: { type: "chassis" } },
        { variantId: variants[2]._id, optionIds: { type: "frame" } },
      ],
    },
    [variants[0], variants[2]],
    "published",
  );
  assert.equal(resolveVariantId(config, { type: "frame" }), variants[2]._id);
});

test("two dependent groups expose only explicitly mapped downstream options", () => {
  const config = normalizeVariantSelector(twoGroupConfig, variants, "published");
  assert.deepEqual([...getAvailableOptionIds(config, "size", {})], []);
  assert.deepEqual(
    [...getAvailableOptionIds(config, "size", { type: "frame" })],
    ["large"],
  );
  assert.deepEqual(
    [...getAvailableOptionIds(config, "size", { type: "chassis" })].sort(),
    ["large", "small"],
  );
});

test("three or more groups resolve without a cartesian product", () => {
  const material = {
    id: "material",
    key: "material",
    label: "جنس",
    displayType: "radio",
    required: true,
    order: 2,
    options: [{ id: "wood", label: "چوب", order: 0 }],
  };
  const raw = {
    ...twoGroupConfig,
    groups: [...twoGroupConfig.groups, material],
    mappings: twoGroupConfig.mappings.map((mapping) => ({
      ...mapping,
      optionIds: { ...mapping.optionIds, material: "wood" },
    })),
  };
  const config = normalizeVariantSelector(raw, variants, "published");
  assert.equal(
    resolveVariantId(config, { type: "frame", size: "large", material: "wood" }),
    variants[2]._id,
  );
  assert.equal(resolveVariantId(config, { type: "frame", size: "small", material: "wood" }), undefined);
});

test("invalid and incomplete combinations never resolve", () => {
  const config = normalizeVariantSelector(twoGroupConfig, variants, "published");
  assert.equal(resolveVariantId(config, { type: "frame" }), undefined);
  assert.equal(resolveVariantId(config, { type: "frame", size: "small" }), undefined);
});

test("duplicate combinations are rejected", () => {
  const raw = structuredClone(twoGroupConfig);
  raw.mappings[2].optionIds = { type: "chassis", size: "large" };
  assert.throws(
    () => normalizeVariantSelector(raw, variants, "published"),
    (error) => error instanceof VariantSelectorValidationError && /قبلاً/.test(error.message),
  );
});

test("missing or deleted option references are rejected", () => {
  const raw = structuredClone(twoGroupConfig);
  raw.mappings[0].optionIds.size = "deleted";
  assert.throws(
    () => normalizeVariantSelector(raw, variants, "published"),
    (error) => error instanceof VariantSelectorValidationError && /حذف شده/.test(error.message),
  );
});

test("published selectors reject unmapped active variants but drafts may be incomplete", () => {
  const raw = structuredClone(twoGroupConfig);
  raw.mappings.pop();
  assert.doesNotThrow(() => normalizeVariantSelector(raw, variants, "draft"));
  assert.throws(
    () => normalizeVariantSelector(raw, variants, "published"),
    (error) => error instanceof VariantSelectorValidationError && /بدون اتصال/.test(error.message),
  );
});

test("changing the first attribute makes an invalid downstream choice unresolved", () => {
  const config = normalizeVariantSelector(twoGroupConfig, variants, "published");
  assert.equal(resolveVariantId(config, { type: "chassis", size: "small" }), variants[0]._id);
  assert.equal(resolveVariantId(config, { type: "frame", size: "small" }), undefined);
  assert.equal(getAvailableOptionIds(config, "size", { type: "frame" }).has("small"), false);
});

test("out-of-stock variants remain the exact resolved SKU for availability handling", () => {
  const config = normalizeVariantSelector(twoGroupConfig, variants, "published");
  const variantId = resolveVariantId(config, { type: "chassis", size: "large" });
  const variant = variants.find((item) => item._id === variantId);
  assert.equal(variantId, variants[1]._id);
  assert.equal(variant.stock, 0);
});

test("server-derived attribute labels correspond to the mapped variant", () => {
  const config = normalizeVariantSelector(twoGroupConfig, variants, "published");
  assert.deepEqual(
    getVariantAttributeSelections(config, variants[2]._id).map(({ label, optionLabel }) => ({ label, optionLabel })),
    [
      { label: "نوع محصول", optionLabel: "تابلو" },
      { label: "اندازه", optionLabel: "بزرگ" },
    ],
  );
});

test("legacy products without a selector keep the old path", () => {
  assert.equal(normalizeVariantSelector(undefined, variants, "published"), undefined);
  assert.equal(resolveVariantId(undefined, { type: "frame" }), undefined);
});

test("reference wall-art shape supports four chassis sizes and two frame sizes", () => {
  const wallVariants = [
    ...variants,
    { _id: "66f123456789abcdef123454", title: "شاسی متوسط", price: 150, stock: 2, isActive: true },
    { _id: "66f123456789abcdef123455", title: "شاسی خیلی بزرگ", price: 250, stock: 2, isActive: true },
    { _id: "66f123456789abcdef123456", title: "تابلو خیلی بزرگ", price: 350, stock: 2, isActive: true },
  ];
  const sizes = ["s", "m", "l", "xl"];
  const raw = {
    ...twoGroupConfig,
    groups: [
      twoGroupConfig.groups[0],
      {
        ...twoGroupConfig.groups[1],
        options: sizes.map((id, order) => ({ id, label: id, order })),
      },
    ],
    mappings: [
      { variantId: wallVariants[0]._id, optionIds: { type: "chassis", size: "s" } },
      { variantId: wallVariants[3]._id, optionIds: { type: "chassis", size: "m" } },
      { variantId: wallVariants[1]._id, optionIds: { type: "chassis", size: "l" } },
      { variantId: wallVariants[4]._id, optionIds: { type: "chassis", size: "xl" } },
      { variantId: wallVariants[2]._id, optionIds: { type: "frame", size: "l" } },
      { variantId: wallVariants[5]._id, optionIds: { type: "frame", size: "xl" } },
    ],
  };
  const config = normalizeVariantSelector(raw, wallVariants, "published");
  assert.deepEqual(
    [...getAvailableOptionIds(config, "size", { type: "chassis" })].sort(),
    ["l", "m", "s", "xl"],
  );
  assert.deepEqual(
    [...getAvailableOptionIds(config, "size", { type: "frame" })].sort(),
    ["l", "xl"],
  );
  assert.equal(resolveVariantId(config, { type: "frame", size: "s" }), undefined);
});
// 