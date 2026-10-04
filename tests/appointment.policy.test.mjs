import test from "node:test";
import assert from "node:assert/strict";
import {
  canAdminTransition,
  cancellationAllowed,
  canonicalPayloadHash,
  claimFirstAvailableSeat,
  computeRewardDiscount,
  slotKey,
} from "../lib/appointments/policy.ts";

test("two concurrent requests cannot both claim the final seat", async () => {
  const occupied = new Set();
  const atomicClaim = async (seat) => {
    await Promise.resolve();
    if (occupied.has(seat)) return null;
    occupied.add(seat);
    return seat;
  };
  const results = await Promise.all([
    claimFirstAvailableSeat(1, atomicClaim),
    claimFirstAvailableSeat(1, atomicClaim),
  ]);
  assert.equal(results.filter((value) => value === 1).length, 1);
  assert.equal(results.filter((value) => value === null).length, 1);
  assert.equal(occupied.size, 1);
});

test("seat allocation fills distinct capacity and then reports full", async () => {
  const occupied = new Set();
  const claim = async (seat) => {
    if (occupied.has(seat)) return null;
    occupied.add(seat);
    return seat;
  };
  assert.equal(await claimFirstAvailableSeat(2, claim), 1);
  assert.equal(await claimFirstAvailableSeat(2, claim), 2);
  assert.equal(await claimFirstAvailableSeat(2, claim), null);
});

test("idempotency hash is stable for key order and changes with payload", () => {
  const first = canonicalPayloadHash({ serviceType: "repair", device: "ps5" });
  const reordered = canonicalPayloadHash({ device: "ps5", serviceType: "repair" });
  const changed = canonicalPayloadHash({ device: "ps4", serviceType: "repair" });
  assert.equal(first, reordered);
  assert.notEqual(first, changed);
});

test("status transitions prevent users/admins from completing invalid states", () => {
  assert.equal(canAdminTransition("pending", "confirmed"), true);
  assert.equal(canAdminTransition("confirmed", "completed"), true);
  assert.equal(canAdminTransition("cancelled", "completed"), false);
  assert.equal(canAdminTransition("completed", "pending"), false);
});

test("cancellation notice boundary is deterministic", () => {
  const now = new Date("2026-10-04T08:00:00.000Z");
  assert.equal(cancellationAllowed(new Date("2026-10-04T10:00:00.000Z"), now, 120), true);
  assert.equal(cancellationAllowed(new Date("2026-10-04T09:59:59.999Z"), now, 120), false);
});

test("reward discounts stay integer, scoped and never exceed service amount", () => {
  assert.equal(computeRewardDiscount({ type: "percent", value: 25, maxDiscountAmount: 30_000, baseAmount: 200_000, serviceType: "repair" }), 30_000);
  assert.equal(computeRewardDiscount({ type: "fixed", value: 500_000, baseAmount: 100_000, serviceType: "repair" }), 100_000);
  assert.equal(computeRewardDiscount({ type: "free_game", value: 0, baseAmount: 120_000, serviceType: "game_install" }), 120_000);
  assert.equal(computeRewardDiscount({ type: "free_game", value: 0, baseAmount: 120_000, serviceType: "repair" }), 0);
  assert.equal(computeRewardDiscount({ type: "free_shipping", value: 100_000, baseAmount: 120_000, serviceType: "game_install" }), 0);
  assert.equal(computeRewardDiscount({ type: "percent", value: 20, baseAmount: 0, serviceType: "repair" }), 0);
});

test("slot keys explicitly separate services at the same time", () => {
  const at = new Date("2026-10-04T08:00:00.000Z");
  assert.notEqual(slotKey("repair", at), slotKey("game_install", at));
});
