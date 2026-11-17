import assert from "node:assert/strict";
import test from "node:test";
import { secondsUntilNextOffersCycle } from "./lib/landing-offers-countdown.ts";

test("special offers count down to 08:00 Tehran time and restart for the next day", () => {
  assert.equal(secondsUntilNextOffersCycle(Date.parse("2026-11-17T07:59:59.999+03:30")), 1);
  assert.equal(secondsUntilNextOffersCycle(Date.parse("2026-11-17T08:00:00+03:30")), 86400);
  assert.equal(secondsUntilNextOffersCycle(Date.parse("2026-11-17T08:00:01+03:30")), 86399);
  assert.equal(secondsUntilNextOffersCycle(Date.parse("2026-11-18T00:00:00+03:30")), 28800);
  assert.equal(secondsUntilNextOffersCycle(Date.parse("2026-11-18T04:30:00Z")), 86400);
});
