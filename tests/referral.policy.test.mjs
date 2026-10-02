import assert from "node:assert/strict";
import test from "node:test";
import {
  isRewardOrderEligible,
  isValidReferralCode,
  normalizeReferralCode,
  referralRewardKeys,
} from "../lib/loyalty/referral.policy.ts";

test("referral codes are trimmed, uppercased and format checked", () => {
  assert.equal(normalizeReferralCode("  ka-a1b2c3  "), "KA-A1B2C3");
  assert.equal(isValidReferralCode("ka-a1b2c3"), true);
  assert.equal(isValidReferralCode("KA-123"), false);
  assert.equal(isValidReferralCode("XX-A1B2C3"), false);
});

test("only the recorded first order can qualify", () => {
  assert.equal(
    isRewardOrderEligible({
      firstOrderId: "order-1",
      orderId: "order-2",
      orderAmount: 500_000,
      minimumAmount: 100_000,
    }),
    false,
  );
});

test("a first order below the minimum stays ineligible", () => {
  assert.equal(
    isRewardOrderEligible({
      firstOrderId: "order-1",
      orderId: "order-1",
      orderAmount: 99_999,
      minimumAmount: 100_000,
    }),
    false,
  );
});

test("an eligible first order uses stable, recipient-specific keys", () => {
  assert.equal(
    isRewardOrderEligible({
      firstOrderId: "order-1",
      orderId: "order-1",
      orderAmount: 100_000,
      minimumAmount: 100_000,
    }),
    true,
  );
  assert.deepEqual(referralRewardKeys("ref-1"), {
    referrer: "referral:referrer:ref-1",
    referee: "referral:referee:ref-1",
    xp: "xp:referral:ref-1",
  });
  assert.deepEqual(referralRewardKeys("ref-1"), referralRewardKeys("ref-1"));
});
