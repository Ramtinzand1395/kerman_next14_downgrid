import assert from "node:assert/strict";
import test from "node:test";
import {
  isRewardOrderEligible,
  isValidReferralCode,
  normalizeReferralCode,
  pendingReferralRewardSteps,
  referralAttachmentError,
  referralRewardKeys,
  restoredReferralCode,
  shouldClearReferralForMobileChange,
} from "../lib/loyalty/referral.policy.ts";

test("referral codes are trimmed, uppercased and format checked", () => {
  assert.equal(normalizeReferralCode("  ka-a1b2c3  "), "KA-A1B2C3");
  assert.equal(isValidReferralCode("ka-a1b2c3"), true);
  assert.equal(isValidReferralCode("KA-123"), false);
  assert.equal(isValidReferralCode("XX-A1B2C3"), false);
});

test("saved OTP intent wins on refresh and stays bound to its mobile", () => {
  assert.equal(
    restoredReferralCode({
      urlCode: "KA-AAAAAA",
      savedOtpCode: "ka-bbbbbb",
    }),
    "KA-BBBBBB",
  );
  assert.equal(
    shouldClearReferralForMobileChange("09120000000", "09120000000"),
    false,
  );
  assert.equal(
    shouldClearReferralForMobileChange("09120000000", "09350000000"),
    true,
  );
});

test("only a server-bound pending code can be attached", () => {
  assert.equal(
    referralAttachmentError({
      code: "KA-A1B2C3",
      pendingCode: "KA-A1B2C3",
      alreadyAttached: false,
      newUserId: "new-user",
      referrerId: "referrer",
    }),
    null,
  );
  assert.match(
    referralAttachmentError({
      code: "KA-A1B2C3",
      pendingCode: null,
      alreadyAttached: false,
      newUserId: "old-user",
      referrerId: "referrer",
    }),
    /همان جریان معتبر/,
  );
});

test("invalid, self and repeated referrals are rejected clearly", () => {
  assert.match(
    referralAttachmentError({
      code: "bad",
      pendingCode: "BAD",
      alreadyAttached: false,
      newUserId: "new-user",
      referrerId: null,
    }),
    /فرمت/,
  );
  assert.match(
    referralAttachmentError({
      code: "KA-A1B2C3",
      pendingCode: "KA-A1B2C3",
      alreadyAttached: false,
      newUserId: "same-user",
      referrerId: "same-user",
    }),
    /خودتان/,
  );
  assert.match(
    referralAttachmentError({
      code: "KA-A1B2C3",
      pendingCode: "KA-A1B2C3",
      alreadyAttached: true,
      newUserId: "new-user",
      referrerId: "referrer",
    }),
    /قبلاً/,
  );
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

test("a retry only runs unfinished reward steps", () => {
  const completedAt = new Date("2026-10-02T00:00:00Z");
  assert.deepEqual(
    pendingReferralRewardSteps({
      referrerRewardedAt: completedAt,
      refereeRewardedAt: null,
      xpRewardedAt: null,
    }),
    ["referee", "xp"],
  );
  assert.deepEqual(
    pendingReferralRewardSteps({
      referrerRewardedAt: completedAt,
      refereeRewardedAt: completedAt,
      xpRewardedAt: completedAt,
    }),
    [],
  );
});
