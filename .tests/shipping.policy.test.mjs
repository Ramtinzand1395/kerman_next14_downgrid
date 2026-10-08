import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateShippingCost,
  InvalidShippingDestinationError,
} from "../lib/shipping.ts";

const paymentRouteSources = [
  "app/api/payment-zarinpal/request/route.ts",
  "app/api/payment-wallet/route.ts",
].map((path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("shipping cost is determined only from the stored destination", () => {
  const storedAddress = { province: "کرمان", city: "کرمان" };

  assert.equal(calculateShippingCost(storedAddress), 0);
  assert.equal(
    calculateShippingCost({ ...storedAddress, shippingCost: 9_999_999 }),
    calculateShippingCost(storedAddress),
  );
  assert.equal(
    calculateShippingCost({ ...storedAddress, shippingCost: 0 }),
    calculateShippingCost(storedAddress),
  );
});

test("both payment flows receive the same quote for the same address", () => {
  const storedAddress = { province: "تهران", city: "تهران" };
  const zarinpalShippingCost = calculateShippingCost(storedAddress);
  const walletShippingCost = calculateShippingCost(storedAddress);

  assert.equal(zarinpalShippingCost, walletShippingCost);
});

test("a stored address without province or city is rejected", () => {
  assert.throws(
    () => calculateShippingCost({ province: "", city: "کرمان" }),
    InvalidShippingDestinationError,
  );
  assert.throws(
    () => calculateShippingCost({ province: "کرمان", city: undefined }),
    InvalidShippingDestinationError,
  );
});

test("payment routes never read a client shipping cost", () => {
  for (const source of paymentRouteSources) {
    assert.doesNotMatch(source, /payload\.shippingCost/);
    assert.match(source, /calculateShippingCost\(\{/);
    assert.match(source, /province: address\.province/);
    assert.match(source, /city: address\.city/);
    assert.match(
      source,
      /finalPrice = totalPrice - couponDiscount \+ shippingCost/,
    );
  }
});
