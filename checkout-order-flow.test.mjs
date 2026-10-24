import test from "node:test";
import assert from "node:assert/strict";
import { summarizeOrderMoney } from "./lib/orderSummary.ts";
import { buildOrderIdentifiers } from "./lib/orderIdentifierValue.ts";
import { subtractPurchasedItems } from "./lib/cartReconciliation.ts";
import { calculateShippingInfo, KERMAN_SHIPPING_COST } from "./lib/shipping.ts";

test("stored totalPrice is already after product discount", () => {
  const summary = summarizeOrderMoney({
    items: [{ price: 2_350_000, discountPrice: 1_990_000, quantity: 1, total: 1_990_000 }],
    totalPrice: 1_990_000,
    couponDiscount: 100_000,
    shippingCost: 50_000,
    finalPrice: 1_940_000,
  });

  assert.deepEqual(summary, {
    originalItemsTotal: 2_350_000,
    itemsTotal: 1_990_000,
    productDiscount: 360_000,
    couponDiscount: 100_000,
    shippingCost: 50_000,
    payable: 1_940_000,
    itemCount: 1,
  });
});

test("shipping rules keep Kerman prepaid and other cities collect", () => {
  const kerman = calculateShippingInfo({ province: "کرمان", city: "کرمان" });
  const tehran = calculateShippingInfo({ province: "تهران", city: "تهران" });

  assert.equal(kerman.feeToman, KERMAN_SHIPPING_COST);
  assert.equal(kerman.paymentType, "PREPAID");
  assert.equal(tehran.feeToman, null);
  assert.equal(tehran.paymentType, "COLLECT");
  assert.equal(tehran.label, "پس‌کرایه");
});

test("invoice and tracking numbers are deterministic and distinct", () => {
  const first = buildOrderIdentifiers("66f123456789abcdef123456");
  const replay = buildOrderIdentifiers("66f123456789abcdef123456");
  const other = buildOrderIdentifiers("66f123456789abcdef123457");

  assert.deepEqual(first, replay);
  assert.notEqual(first.invoiceNumber, other.invoiceNumber);
  assert.notEqual(first.invoiceNumber, first.trackingCode);
});

test("successful checkout removes only purchased quantities", () => {
  const remaining = subtractPurchasedItems(
    [
      { id: "a", productId: "p1", variantId: "v1", quantity: 3 },
      { id: "b", productId: "p2", quantity: 1 },
    ],
    [{ productId: "p1", variantId: "v1", quantity: 2 }],
  );

  assert.deepEqual(remaining, [
    { id: "a", productId: "p1", variantId: "v1", quantity: 1 },
    { id: "b", productId: "p2", quantity: 1 },
  ]);
});
