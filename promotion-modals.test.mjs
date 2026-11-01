import test from "node:test";
import assert from "node:assert/strict";
import { canShowCoupon } from "./lib/promotions/policy.ts";
import { promotionSchema } from "./validations/promotion.validation.ts";

const now = Date.parse("2026-11-02T10:00:00Z");
const coupon = {
  isActive: true, scope: "public", perUserLimit: 1, allowedUsers: [], usedCount: 0,
  startsAt: "2026-11-01T00:00:00Z", expiresAt: "2026-11-08T00:00:00Z",
};

test("unused account and guest can see a public one-use offer", () => {
  assert.equal(canShowCoupon(coupon, "user-1", false, now), true);
  assert.equal(canShowCoupon(coupon, null, false, now), true);
});
test("used coupon stays hidden even on a new browser or visit", () => {
  assert.equal(canShowCoupon(coupon, "user-1", true, now), false);
});
test("disabled, multi-use and exhausted coupons are never promoted", () => {
  for (const changed of [{ isActive: false }, { perUserLimit: 2 }, { usageLimit: 10, usedCount: 10 }])
    assert.equal(canShowCoupon({ ...coupon, ...changed }, "user-1", false, now), false);
});
test("private coupon is shown only to an allowed signed-in account", () => {
  const privateCoupon = { ...coupon, scope: "private", allowedUsers: ["user-1"] };
  assert.equal(canShowCoupon(privateCoupon, null, false, now), false);
  assert.equal(canShowCoupon(privateCoupon, "user-2", false, now), false);
  assert.equal(canShowCoupon(privateCoupon, "user-1", false, now), true);
});
test("future offers wait and expiry is exclusive, regardless of client clock display", () => {
  assert.equal(canShowCoupon(coupon, "user-1", false, Date.parse(coupon.startsAt) - 1), false);
  assert.equal(canShowCoupon(coupon, "user-1", false, Date.parse(coupon.startsAt)), true);
  assert.equal(canShowCoupon(coupon, "user-1", false, Date.parse(coupon.expiresAt) - 1), true);
  assert.equal(canShowCoupon(coupon, "user-1", false, Date.parse(coupon.expiresAt)), false);
});
test("malformed dates fail closed and no end date remains supported", () => {
  assert.equal(canShowCoupon({ ...coupon, expiresAt: "bad-date" }, null, false, now), false);
  assert.equal(canShowCoupon({ ...coupon, expiresAt: null }, null, false, now), true);
});

const modal = {
  name: "پیشنهاد تابلو", title: "قهرمانت رو بیار توی اتاقت", body: "کد پایین رو موقع پرداخت وارد کن.",
  ctaLabel: "دیدن تابلوها", ctaHref: "/category/gaming-wall-art", dismissLabel: "فعلاً نه",
  coupon: "6ae797d435c7be1063597df1", isActive: true, priority: 10,
};
test("modal accepts a real club coupon id and a local destination", () => {
  assert.equal(promotionSchema.safeParse(modal).success, true);
  assert.equal(promotionSchema.safeParse({ ...modal, coupon: "SETUP5" }).success, false);
});
test("modal destination cannot execute scripts or redirect off-site", () => {
  for (const ctaHref of ["javascript:alert(1)", "https://example.com", "//example.com", "/\\example.com", "/\nexample.com"])
    assert.equal(promotionSchema.safeParse({ ...modal, ctaHref }).success, false);
});
test("empty copy, unexpected fields and invalid priorities are rejected", () => {
  for (const changed of [{ title: " " }, { body: "" }, { priority: -1 }, { priority: 101 }, { priority: 1.5 }, { html: "<script>" }])
    assert.equal(promotionSchema.safeParse({ ...modal, ...changed }).success, false);
});
