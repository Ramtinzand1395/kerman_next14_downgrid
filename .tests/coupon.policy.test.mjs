import test from "node:test";
import assert from "node:assert/strict";
import { computeCouponDiscount, eligibleCouponAmount } from "../lib/loyalty/coupon.policy.ts";

test("product-scoped coupons only discount eligible server-priced lines", () => {
  const result = eligibleCouponAmount(
    1_000_000,
    [
      { productId: "console", categoryIds: ["hardware"], amount: 900_000 },
      { productId: "game", categoryIds: ["games"], amount: 100_000 },
    ],
    ["game"],
    [],
  );
  assert.deepEqual(result, { matches: true, amount: 100_000 });
  assert.equal(
    computeCouponDiscount({ type: "percent", value: 50, eligibleAmount: result.amount }),
    50_000,
  );
});

test("category-scoped coupons sum all matching lines and respect cap", () => {
  const result = eligibleCouponAmount(
    500_000,
    [
      { productId: "a", categoryIds: ["games"], amount: 200_000 },
      { productId: "b", categoryIds: ["games"], amount: 150_000 },
      { productId: "c", categoryIds: ["hardware"], amount: 150_000 },
    ],
    [],
    ["games"],
  );
  assert.equal(result.amount, 350_000);
  assert.equal(
    computeCouponDiscount({
      type: "percent",
      value: 20,
      maxDiscountAmount: 50_000,
      eligibleAmount: result.amount,
    }),
    50_000,
  );
});

test("fixed coupons and zero eligible amount never make totals negative", () => {
  assert.equal(computeCouponDiscount({ type: "fixed", value: 200_000, eligibleAmount: 80_000 }), 80_000);
  assert.equal(computeCouponDiscount({ type: "fixed", value: 20_000, eligibleAmount: 0 }), 0);
});

