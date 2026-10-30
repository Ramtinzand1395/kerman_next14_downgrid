import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_SHIPPING_SETTINGS,
  KERMAN_SHIPPING_COST,
  ShippingMethodUnavailableError,
  calculateShippingInfo,
  createOrderShippingSnapshot,
  formatOrderShippingDisplay,
  getAvailableShippingMethods,
  isValidIranDestination,
} from "./lib/shipping.ts";
import { summarizeOrderMoney } from "./lib/orderSummary.ts";
import { tomanToIrr } from "./lib/currency.ts";

test("Kerman local delivery uses the configured fixed fee", () => {
  const result = calculateShippingInfo(
    { province: "کرمان", city: "کرمان", postalCode: "7616912345" },
    "kerman_local",
  );
  assert.equal(result.feeToman, KERMAN_SHIPPING_COST);
  assert.equal(result.paymentTiming, "online");
  assert.equal(result.feeStatus, "fixed");
});

test("Kerman fixed-price delivery cannot disappear because of legacy disabled settings", () => {
  const settings = structuredClone(DEFAULT_SHIPPING_SETTINGS);
  settings.localDelivery.enabled = false;
  const methods = getAvailableShippingMethods(
    { province: "کرمان", city: "کرمان", postalCode: "7616912345" },
    settings,
  );
  const local = methods.find((option) => option.method === "kerman_local");

  assert.ok(local);
  assert.equal(local.title, "ارسال به شهرستان کرمان");
  assert.equal(local.feeToman, KERMAN_SHIPPING_COST);
  assert.equal(local.paymentTiming, "online");
});

test("national delivery keeps an unknown fee out of the online total", () => {
  const result = calculateShippingInfo(
    { province: "تهران", city: "تهران", postalCode: "1111111111" },
    "national_collect",
  );
  const summary = summarizeOrderMoney({
    totalPrice: 2_000_000,
    couponDiscount: 100_000,
    shippingCost: result.feeToman,
  });
  assert.equal(result.feeToman, null);
  assert.equal(result.paymentTiming, "on_delivery");
  assert.equal(result.feeStatus, "pending_carrier");
  assert.equal(summary.payable, 1_900_000);
});

for (const [method, title] of [
  ["tipax", "ارسال با تیپاکس"],
  ["post_pishtaz", "ارسال با پست پیشتاز"],
]) {
  test(`${method} is carrier-calculated, on-delivery, and never silently free`, () => {
    const settings = structuredClone(DEFAULT_SHIPPING_SETTINGS);
    settings.tipax.enabled = true;
    settings.postPishtaz.enabled = true;
    const result = calculateShippingInfo(
      { province: "تهران", city: "تهران", postalCode: "1111111111" },
      method,
      settings,
    );
    assert.equal(result.title, title);
    assert.equal(result.feeToman, null);
    assert.equal(result.paymentTiming, "on_delivery");
    assert.equal(result.feeStatus, "pending_carrier");
    assert.match(result.label, /شرکت حمل‌ونقل/);
  });
}

test("Tipax and Post Pishtaz can be disabled independently", () => {
  const settings = structuredClone(DEFAULT_SHIPPING_SETTINGS);
  settings.tipax.enabled = true;
  settings.postPishtaz.enabled = true;
  settings.tipax.enabled = false;
  const methods = getAvailableShippingMethods(
    { province: "تهران", city: "تهران" },
    settings,
  ).map((option) => option.method);
  assert.equal(methods.includes("tipax"), false);
  assert.equal(methods.includes("post_pishtaz"), true);
});

test("dashboard fee changes are honored by the calculation contract", () => {
  const settings = structuredClone(DEFAULT_SHIPPING_SETTINGS);
  settings.localDelivery.feeToman = 175_000;
  const result = calculateShippingInfo(
    { province: "کرمان", city: "کرمان" },
    "kerman_local",
    settings,
  );
  assert.equal(result.feeToman, 175_000);
});

test("client cannot inject a shipping amount into the policy calculation", () => {
  const manipulatedDestination = {
    province: "کرمان",
    city: "کرمان",
    shippingCost: 1,
  };
  const result = calculateShippingInfo(manipulatedDestination, "kerman_local");
  assert.equal(result.feeToman, 150_000);
});

test("invalid province and city combinations are rejected", () => {
  assert.equal(isValidIranDestination({ province: "تهران", city: "کرمان" }), false);
  assert.throws(
    () => getAvailableShippingMethods({ province: "تهران", city: "کرمان" }),
    /آدرس ارسال معتبر نیست/,
  );
});

test("postal coverage prefixes restrict local delivery without guessing", () => {
  const settings = structuredClone(DEFAULT_SHIPPING_SETTINGS);
  settings.coverage.postalCodePrefixes = ["761"];
  assert.throws(
    () => calculateShippingInfo(
      { province: "کرمان", city: "کرمان", postalCode: "7711111111" },
      "kerman_local",
      settings,
    ),
    ShippingMethodUnavailableError,
  );
});

test("legacy zero shipping is not interpreted as free", () => {
  const display = formatOrderShippingDisplay({ shippingCost: 0 });
  assert.equal(display.feeToman, null);
  assert.match(display.label, /ثبت نشده/);
  assert.match(display.subtext, /رایگان نیست/);
});

test("shipping snapshot preserves method and amounts through payment callback", () => {
  const selection = calculateShippingInfo(
    { province: "تهران", city: "تهران" },
    "national_collect",
  );
  const snapshot = createOrderShippingSnapshot(selection, {
    province: "تهران",
    city: "تهران",
    address: "خیابان نمونه، پلاک ۱۲",
  });
  assert.deepEqual(
    {
      method: snapshot.method,
      feeToman: snapshot.feeToman,
      paymentTiming: snapshot.paymentTiming,
      feeStatus: snapshot.feeStatus,
    },
    {
      method: "national_collect",
      feeToman: null,
      paymentTiming: "on_delivery",
      feeStatus: "pending_carrier",
    },
  );
});

test("schema conversion changes Toman to IRR exactly once", () => {
  assert.equal(tomanToIrr(150_000), 1_500_000);
  assert.throws(() => tomanToIrr(1.5));
});

test("product JSON-LD never announces zero-cost shipping", async () => {
  const source = await readFile("app/(public)/product/[slug]/page.tsx", "utf8");
  assert.equal(source.includes("shippingDetails"), false);
  assert.equal(source.includes("shippingRate"), false);
  assert.equal(source.includes("tomanToIrr"), true);
  assert.equal(source.includes("priceCurrency: \"IRR\""), true);
});

test("payment endpoints derive shipping server-side and preserve the snapshot", async () => {
  const [requestSource, walletSource, callbackSource] = await Promise.all([
    readFile("app/api/payment-zarinpal/request/route.ts", "utf8"),
    readFile("app/api/payment-wallet/route.ts", "utf8"),
    readFile("app/api/payment-zarinpal/verify/route.ts", "utf8"),
  ]);
  for (const source of [requestSource, walletSource]) {
    assert.match(source, /getStoreShippingSettings/);
    assert.match(source, /createOrderShippingSnapshot/);
    assert.doesNotMatch(source, /payload\.shippingCost/);
  }
  assert.match(callbackSource, /shipping: temp\.shipping \|\| null/);
});

test("POS-facing order fields keep items, site payment, and shipping separate", async () => {
  const modelSource = await readFile("model/Order.ts", "utf8");
  const apiSource = await readFile("app/api/admin/order/route.ts", "utf8");
  assert.match(modelSource, /totalPrice/);
  assert.match(modelSource, /finalPrice/);
  assert.match(modelSource, /shippingCost/);
  assert.match(modelSource, /shipping:/);
  assert.match(modelSource, /tipax/);
  assert.match(modelSource, /post_pishtaz/);
  assert.match(apiSource, /itemsSubtotalToman/);
  assert.match(apiSource, /shippingFeeToman/);
  assert.match(apiSource, /onlinePaymentAmountToman/);
  assert.match(apiSource, /shippingIncludedInOnlinePayment/);
});
