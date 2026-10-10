import test from "node:test";
import assert from "node:assert/strict";
import {
  OTP_LIMITS,
  normalizeMobileForRateLimit,
  computeMobileRateLimitDecision,
} from "../lib/rateLimit/policy.ts";

test("normalizeMobileForRateLimit normalizes Persian and Arabic numerals and formats", () => {
  assert.equal(normalizeMobileForRateLimit("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
  assert.equal(normalizeMobileForRateLimit("٠٩١٢٣٤٥٦٧٨٩"), "09123456789");
  assert.equal(normalizeMobileForRateLimit("+989123456789"), "09123456789");
  assert.equal(normalizeMobileForRateLimit("989123456789"), "09123456789");
  assert.equal(normalizeMobileForRateLimit("9123456789"), "09123456789");
  assert.equal(normalizeMobileForRateLimit(" 0912 345 6789 "), "09123456789");
});

test("rate limit logic enforces 120s cooldown between requests", () => {
  const now = new Date();
  const lastSentAt = new Date(now.getTime() - 35 * 1000); // 35 seconds ago
  const decision = computeMobileRateLimitDecision({
    now,
    lastSentAt,
    windowStart: new Date(now.getTime() - 35 * 1000),
    count: 1,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "COOLDOWN");
  assert.equal(decision.retryAfter, 85);
});

test("rate limit allows request after 120s cooldown", () => {
  const now = new Date();
  const lastSentAt = new Date(now.getTime() - 121 * 1000); // 121 seconds ago
  const decision = computeMobileRateLimitDecision({
    now,
    lastSentAt,
    windowStart: new Date(now.getTime() - 121 * 1000),
    count: 1,
  });

  assert.equal(decision.allowed, true);
});

test("rate limit logic enforces 5 requests per 30 minutes window", () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const lastSentAt = new Date(now.getTime() - 130 * 1000); // cooldown passed
  const decision = computeMobileRateLimitDecision({
    now,
    lastSentAt,
    windowStart,
    count: 5,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "WINDOW_LIMIT");
  assert.ok(decision.retryAfter && decision.retryAfter > 0);
});

test("concurrent lock logic rejects second request while lock is active", () => {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 10 * 1000); // active for 10s
  const decision = computeMobileRateLimitDecision({
    now,
    windowStart: now,
    count: 0,
    lockedUntil,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "CONCURRENT_REQUEST");
  assert.ok(decision.retryAfter && decision.retryAfter > 0);
});
