/**
 * Tests for courier region matching and city-name normalization.
 *
 * Covers:
 * - normalizeCityName: trim, Arabic chars, zero-width chars, multi-space, prefixes
 * - findCourierRegion: ID-first, city fallback, inactive regions, out-of-region
 * - computeAppointmentPricing: free_shipping, maxShippingCost, courier disabled
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCityName,
  findCourierRegion,
} from "../lib/appointments/courier.utils.ts";

import { computeAppointmentPricing } from "../lib/appointments/policy.ts";

// ─── Shared fixtures ───────────────────────────────────────────────────────────

const kermanRegion = {
  id: "kerman_city",
  title: "شهر کرمان",
  city: "کرمان",
  shippingCost: 50_000,
  isActive: true,
};

const inactiveRegion = {
  id: "rafsanjan",
  title: "رفسنجان",
  city: "رفسنجان",
  shippingCost: 80_000,
  isActive: false,
};

const activeRegions = [kermanRegion, inactiveRegion];

// ─── normalizeCityName ─────────────────────────────────────────────────────────

test("normalizeCityName: plain کرمان stays unchanged", () => {
  assert.equal(normalizeCityName("کرمان"), "کرمان");
});

test("normalizeCityName: leading/trailing whitespace is trimmed", () => {
  assert.equal(normalizeCityName("  کرمان  "), "کرمان");
});

test("normalizeCityName: multiple internal spaces collapse to one", () => {
  assert.equal(normalizeCityName("کر  مان"), "کر مان");
});

test("normalizeCityName: Arabic ك is converted to Persian ک", () => {
  // ك = U+0643 (Arabic Kaf), ک = U+06A9 (Extended Arabic Kaf)
  assert.equal(normalizeCityName("\u0643\u0631\u0645\u0627\u0646"), "کرمان");
});

test("normalizeCityName: Arabic ي is converted to Persian ی", () => {
  // ي = U+064A, ی = U+06CC
  assert.equal(normalizeCityName("تهران\u064A"), "تهرانی");
});

test("normalizeCityName: zero-width characters are removed", () => {
  // U+200C = ZWNJ, U+200B = ZWS
  assert.equal(normalizeCityName("کر\u200Cمان"), "کرمان");
  assert.equal(normalizeCityName("\u200Bکرمان\u200B"), "کرمان");
});

test("normalizeCityName: soft hyphen is removed", () => {
  // U+00AD = soft hyphen
  assert.equal(normalizeCityName("کر\u00ADمان"), "کرمان");
});

test("normalizeCityName: 'شهر کرمان' strips 'شهر ' prefix → 'کرمان'", () => {
  assert.equal(normalizeCityName("شهر کرمان"), "کرمان");
});

test("normalizeCityName: 'شهرستان کرمان' strips 'شهرستان ' prefix → 'کرمان'", () => {
  assert.equal(normalizeCityName("شهرستان کرمان"), "کرمان");
});

test("normalizeCityName: combination – Arabic chars + prefix + spaces", () => {
  // 'شهر كرمان' with Arabic ك and extra spaces
  assert.equal(normalizeCityName("  شهر \u0643\u0631\u0645\u0627\u0646  "), "کرمان");
});

// ─── findCourierRegion ─────────────────────────────────────────────────────────

test("findCourierRegion: matches plain 'کرمان' city name", () => {
  const result = findCourierRegion("کرمان", activeRegions);
  assert.ok(result, "should find a region");
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: matches 'شهر کرمان' via prefix stripping", () => {
  const result = findCourierRegion("شهر کرمان", activeRegions);
  assert.ok(result, "should find a region for 'شهر کرمان'");
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: matches city name with leading/trailing spaces", () => {
  const result = findCourierRegion("  کرمان  ", activeRegions);
  assert.ok(result);
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: matches city with Arabic ك", () => {
  // ك U+0643 instead of ک U+06A9
  const result = findCourierRegion("\u0643\u0631\u0645\u0627\u0646", activeRegions);
  assert.ok(result, "Arabic ك should resolve to persian ک region");
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: matches city with Arabic ي", () => {
  const regionsWithYeh = [
    {
      id: "test_yeh",
      title: "تستی",
      city: "تستی", // Persian ی U+06CC
      shippingCost: 10_000,
      isActive: true,
    },
  ];
  // Query with Arabic ي U+064A
  const result = findCourierRegion("تست\u064A", regionsWithYeh);
  assert.ok(result);
  assert.equal(result?.id, "test_yeh");
});

test("findCourierRegion: returns null for out-of-region address", () => {
  const result = findCourierRegion("مشهد", activeRegions);
  assert.equal(result, null);
});

test("findCourierRegion: inactive region is not returned by city name", () => {
  // رفسنجان is in activeRegions but isActive: false
  const result = findCourierRegion("رفسنجان", activeRegions);
  assert.equal(result, null, "inactive region must not be returned");
});

test("findCourierRegion: ID lookup takes priority over city name", () => {
  const result = findCourierRegion("مشهد", activeRegions, "kerman_city");
  assert.ok(result, "ID match should override city mismatch");
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: inactive region is not returned by ID", () => {
  const result = findCourierRegion("رفسنجان", activeRegions, "rafsanjan");
  assert.equal(result, null, "inactive region must not be returned even by ID");
});

test("findCourierRegion: falls back to city name if regionId not found", () => {
  const result = findCourierRegion("کرمان", activeRegions, "nonexistent_id");
  assert.ok(result, "should fall back to city matching");
  assert.equal(result?.id, "kerman_city");
});

test("findCourierRegion: empty regions array returns null", () => {
  const result = findCourierRegion("کرمان", []);
  assert.equal(result, null);
});

// ─── computeAppointmentPricing: courier scenarios ─────────────────────────────

test("pricing: courier without reward – full shipping cost is charged", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 100_000,
    reward: null,
  });
  assert.equal(pricing.shippingBaseAmount, 100_000);
  assert.equal(pricing.shippingDiscountAmount, 0);
  assert.equal(pricing.shippingFinalAmount, 100_000);
});

test("pricing: free_shipping reward covers full shipping when no cap", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 100_000,
    reward: { type: "free_shipping", value: 0 },
  });
  assert.equal(pricing.shippingDiscountAmount, 100_000);
  assert.equal(pricing.shippingFinalAmount, 0);
});

test("pricing: free_shipping with maxShippingCost cap is respected", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 100_000,
    reward: { type: "free_shipping", value: 0, maxShippingCost: 60_000 },
  });
  assert.equal(pricing.shippingDiscountAmount, 60_000);
  assert.equal(pricing.shippingFinalAmount, 40_000);
});

test("pricing: free_shipping region mismatch yields no discount", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 100_000,
    deliveryCity: "مشهد",
    reward: {
      type: "free_shipping",
      value: 0,
      shippingRegion: "کرمان",
    },
  });
  assert.equal(pricing.shippingDiscountAmount, 0);
  assert.equal(pricing.shippingFinalAmount, 100_000);
});

test("pricing: free_shipping with matching region applies discount", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 100_000,
    deliveryCity: "کرمان",
    reward: {
      type: "free_shipping",
      value: 0,
      shippingRegion: "کرمان",
    },
  });
  assert.equal(pricing.shippingDiscountAmount, 100_000);
  assert.equal(pricing.shippingFinalAmount, 0);
});

test("pricing: in_store (courier disabled scenario) – shipping is always zero", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "in_store",
    serviceType: "repair",
    shippingBaseAmount: 100_000, // should be ignored for in_store
    reward: { type: "free_shipping", value: 0 },
  });
  assert.equal(pricing.shippingBaseAmount, 0);
  assert.equal(pricing.shippingDiscountAmount, 0);
  assert.equal(pricing.shippingFinalAmount, 0);
});

test("pricing: round-trip shipping (2x pickup cost) computed correctly", () => {
  // Simulates the service.ts pattern: pickupCost + returnCost = shippingBaseAmount
  const pickupShippingCost = 50_000;
  const returnShippingCost = 50_000; // multiplier > 1
  const shippingBaseAmount = pickupShippingCost + returnShippingCost;

  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "game_install",
    shippingBaseAmount,
    reward: null,
  });
  assert.equal(pricing.shippingBaseAmount, 100_000);
  assert.equal(pricing.shippingFinalAmount, 100_000);
  assert.equal(pricing.shippingDiscountAmount, 0);
});

test("pricing: free_shipping discount cannot exceed shippingBaseAmount", () => {
  // Even if maxShippingCost is larger than the actual shipping cost
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    shippingBaseAmount: 50_000,
    reward: { type: "free_shipping", value: 0, maxShippingCost: 200_000 },
  });
  assert.equal(pricing.shippingDiscountAmount, 50_000);
  assert.equal(pricing.shippingFinalAmount, 0);
});
