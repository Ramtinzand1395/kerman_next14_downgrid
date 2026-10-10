import test from "node:test";
import assert from "node:assert/strict";
import {
  canAdminTransition,
  canCourierTransition,
  cancellationAllowed,
  canonicalPayloadHash,
  claimFirstAvailableSeat,
  computeAppointmentPricing,
  computeRewardDiscount,
  courierSlotKey,
  courierUserCancellationAllowed,
  formatRewardDescription,
  normalizeRewardRuleData,
  slotKey,
  supportedDevicesForService,
  validateRewardRuleData,
} from "../lib/appointments/policy.ts";

test("device options are scoped to the selected appointment service", () => {
  const configured = ["ps5", "ps4", "xbox-series", "xbox-one"];

  assert.deepEqual(supportedDevicesForService("game_install", configured), [
    "ps5",
    "ps4",
  ]);
  assert.deepEqual(supportedDevicesForService("repair", configured), [
    "ps5",
    "ps4",
    "xbox-series",
    "xbox-one",
    "ps2",
    "ps1",
  ]);
});

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

test("courier transitions enforce physical lifecycle order", () => {
  assert.equal(canCourierTransition("pending", "scheduled"), true);
  assert.equal(canCourierTransition("scheduled", "picked_up"), true);
  assert.equal(canCourierTransition("picked_up", "at_store"), true);
  assert.equal(canCourierTransition("at_store", "return_ready"), true);
  assert.equal(canCourierTransition("return_ready", "returning"), true);
  assert.equal(canCourierTransition("returning", "delivered"), true);

  // Invalid shortcuts
  assert.equal(canCourierTransition("pending", "delivered"), false);
  assert.equal(canCourierTransition("picked_up", "delivered"), false);
  assert.equal(canCourierTransition("delivered", "pending"), false);
  assert.equal(canCourierTransition("cancelled", "scheduled"), false);
});

test("courier cancellation by user is blocked once device is picked up", () => {
  assert.equal(courierUserCancellationAllowed("pending"), true);
  assert.equal(courierUserCancellationAllowed("scheduled"), true);
  assert.equal(courierUserCancellationAllowed("assigned"), true);

  assert.equal(courierUserCancellationAllowed("picked_up"), false);
  assert.equal(courierUserCancellationAllowed("at_store"), false);
  assert.equal(courierUserCancellationAllowed("return_ready"), false);
  assert.equal(courierUserCancellationAllowed("returning"), false);
  assert.equal(courierUserCancellationAllowed("delivered"), false);
});

test("courier slot key formats date and window distinctly", () => {
  const key1 = courierSlotKey("2026-10-10", "09:00", "13:00");
  const key2 = courierSlotKey("2026-10-10", "15:00", "19:00");
  const key3 = courierSlotKey("2026-10-11", "09:00", "13:00");
  assert.equal(key1, "courier:2026-10-10:09:00-13:00");
  assert.notEqual(key1, key2);
  assert.notEqual(key1, key3);
});

test("formatRewardDescription produces correct Persian labels", () => {
  assert.match(
    formatRewardDescription({ type: "percent", value: 10, maxDiscountAmount: 200_000 }),
    /۱۰٪ تخفیف تا سقف/,
  );
  assert.match(
    formatRewardDescription({ type: "fixed", value: 200_000 }),
    /تومان تخفیف/,
  );
  assert.equal(
    formatRewardDescription({ type: "free_game" }),
    "یک نصب بازی رایگان",
  );
  assert.match(
    formatRewardDescription({ type: "free_shipping", maxShippingCost: 100_000 }),
    /ارسال رایگان تا سقف/,
  );
  assert.match(
    formatRewardDescription({ type: "free_shipping", shippingRegion: "کرمان" }),
    /ارسال رایگان با پیک \(کرمان\)/,
  );
});

test("computeAppointmentPricing: in_store ignores free_shipping and keeps shipping zero", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "in_store",
    serviceType: "repair",
    serviceBaseAmount: 400_000,
    shippingBaseAmount: 100_000, // Even if passed, must be 0 for in_store
    reward: {
      type: "free_shipping",
      value: 0,
      maxShippingCost: 100_000,
    },
  });
  assert.equal(pricing.shippingBaseAmount, 0);
  assert.equal(pricing.shippingDiscountAmount, 0);
  assert.equal(pricing.shippingFinalAmount, 0);
  assert.equal(pricing.serviceBaseAmount, 400_000);
  assert.equal(pricing.serviceDiscountAmount, 0);
  assert.equal(pricing.finalAmount, 400_000);
});

test("computeAppointmentPricing: courier applies free_shipping with cap and leaves service intact", () => {
  const pricing = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "repair",
    serviceBaseAmount: 500_000,
    shippingBaseAmount: 150_000,
    reward: {
      type: "free_shipping",
      value: 0,
      maxShippingCost: 100_000,
    },
  });
  assert.equal(pricing.shippingBaseAmount, 150_000);
  assert.equal(pricing.shippingDiscountAmount, 100_000);
  assert.equal(pricing.shippingFinalAmount, 50_000);
  assert.equal(pricing.serviceBaseAmount, 500_000);
  assert.equal(pricing.serviceFinalAmount, 500_000);
  assert.equal(pricing.totalDiscountAmount, 100_000);
  assert.equal(pricing.finalAmount, 550_000);
});

test("computeAppointmentPricing: free_shipping respects region constraint", () => {
  const matching = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "game_install",
    serviceBaseAmount: 200_000,
    shippingBaseAmount: 80_000,
    deliveryCity: "کرمان",
    reward: {
      type: "free_shipping",
      value: 0,
      shippingRegion: "کرمان",
    },
  });
  assert.equal(matching.shippingDiscountAmount, 80_000);
  assert.equal(matching.shippingFinalAmount, 0);

  const mismatched = computeAppointmentPricing({
    fulfillment: "courier",
    serviceType: "game_install",
    serviceBaseAmount: 200_000,
    shippingBaseAmount: 80_000,
    deliveryCity: "رفسنجان",
    reward: {
      type: "free_shipping",
      value: 0,
      shippingRegion: "کرمان",
    },
  });
  assert.equal(mismatched.shippingDiscountAmount, 0);
  assert.equal(mismatched.shippingFinalAmount, 80_000);
});

test("computeAppointmentPricing: minAmount condition is enforced on serviceBaseAmount", () => {
  const belowMin = computeAppointmentPricing({
    fulfillment: "in_store",
    serviceType: "repair",
    serviceBaseAmount: 100_000,
    reward: {
      type: "percent",
      value: 20,
      minAmount: 200_000,
    },
  });
  assert.equal(belowMin.serviceDiscountAmount, 0);
  assert.equal(belowMin.finalAmount, 100_000);

  const meetsMin = computeAppointmentPricing({
    fulfillment: "in_store",
    serviceType: "repair",
    serviceBaseAmount: 250_000,
    reward: {
      type: "percent",
      value: 20,
      minAmount: 200_000,
    },
  });
  assert.equal(meetsMin.serviceDiscountAmount, 50_000);
  assert.equal(meetsMin.finalAmount, 200_000);
});

test("validateRewardRuleData validates percent bounds, fixed values, and dates", () => {
  // Percent > 100 rejected
  const p101 = validateRewardRuleData({
    reward: { type: "percent", value: 101 },
  });
  assert.equal(p101.valid, false);

  // Percent 0 rejected
  const p0 = validateRewardRuleData({
    reward: { type: "percent", value: 0 },
  });
  assert.equal(p0.valid, false);

  // Fixed 0 rejected
  const f0 = validateRewardRuleData({
    reward: { type: "fixed", value: 0 },
  });
  assert.equal(f0.valid, false);

  // EndsAt <= StartsAt rejected
  const invDates = validateRewardRuleData({
    reward: { type: "percent", value: 10 },
    startsAt: new Date("2026-10-10"),
    endsAt: new Date("2026-10-09"),
  });
  assert.equal(invDates.valid, false);

  // Valid rule passes
  const valid = validateRewardRuleData({
    reward: { type: "percent", value: 15, maxDiscountAmount: 50_000 },
    startsAt: new Date("2026-10-10"),
    endsAt: new Date("2026-10-20"),
  });
  assert.equal(valid.valid, true);
});

test("normalizeRewardRuleData clears unused fields based on reward type", () => {
  const percentRule = normalizeRewardRuleData({
    reward: {
      type: "percent",
      value: 15,
      shippingRegion: "کرمان",
      maxShippingCost: 50_000,
    },
  });
  assert.equal(percentRule.reward.shippingRegion, "");
  assert.equal(percentRule.reward.maxShippingCost, null);

  const freeShippingRule = normalizeRewardRuleData({
    reward: {
      type: "free_shipping",
      value: 500,
      maxDiscountAmount: 100_000,
      eligibleInstallationTypes: ["account"],
      shippingRegion: "کرمان",
    },
  });
  assert.equal(freeShippingRule.reward.value, 0);
  assert.equal(freeShippingRule.reward.maxDiscountAmount, null);
  assert.deepEqual(freeShippingRule.reward.eligibleInstallationTypes, []);
  assert.equal(freeShippingRule.reward.shippingRegion, "کرمان");
});
