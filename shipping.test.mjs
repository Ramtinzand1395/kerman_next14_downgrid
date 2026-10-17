import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateShippingInfo,
  calculateShippingCost,
  formatOrderShippingDisplay,
  isKermanCity,
  normalizeCityName,
  InvalidShippingDestinationError,
  KERMAN_SHIPPING_COST,
  COLLECT_SHIPPING_COST,
  COLLECT_SHIPPING_LABEL,
  COLLECT_SHIPPING_NOTE,
} from "./lib/shipping.ts";

test("Normalize City Name handles spaces, Arabic kaf/yeh and diacritics", () => {
  assert.equal(normalizeCityName("  كرمان  "), "کرمان");
  assert.equal(normalizeCityName("سيرجان"), "سیرجان");
  assert.equal(normalizeCityName("جيرفت"), "جیرفت");
  assert.equal(normalizeCityName("بابك"), "بابک");
  assert.equal(normalizeCityName("كَرْمَان"), "کرمان");
  assert.equal(normalizeCityName("کرمان\u200c"), "کرمان");
});

test("isKermanCity identifies only Kerman county and handles variations", () => {
  // Variations of Kerman city
  assert.equal(isKermanCity("کرمان"), true);
  assert.equal(isKermanCity("كرمان"), true);
  assert.equal(isKermanCity("  كرمان  "), true);
  assert.equal(isKermanCity("شهرستان کرمان"), true);
  assert.equal(isKermanCity("شهرستان كرمان"), true);
  assert.equal(isKermanCity("شهر کرمان"), true);
  assert.equal(isKermanCity("kerman"), true);
  assert.equal(isKermanCity("KERMAN"), true);

  // Other cities in Kerman province MUST be false
  assert.equal(isKermanCity("رفسنجان"), false);
  assert.equal(isKermanCity("سیرجان"), false);
  assert.equal(isKermanCity("سيرجان"), false);
  assert.equal(isKermanCity("بم"), false);
  assert.equal(isKermanCity("جیرفت"), false);
  assert.equal(isKermanCity("جيرفت"), false);
  assert.equal(isKermanCity("زرند"), false);
  assert.equal(isKermanCity("کهنوج"), false);
  assert.equal(isKermanCity("كهنوج"), false);
  assert.equal(isKermanCity("بافت"), false);
  assert.equal(isKermanCity("بردسير"), false);
  assert.equal(isKermanCity("راور"), false);
  assert.equal(isKermanCity("منوجان"), false);

  // Other provinces/cities MUST be false
  assert.equal(isKermanCity("تهران"), false);
  assert.equal(isKermanCity("شیراز"), false);
  assert.equal(isKermanCity("اصفهان"), false);
  assert.equal(isKermanCity("مشهد"), false);
  assert.equal(isKermanCity("تبریز"), false);
  assert.equal(isKermanCity("کرمانشاه"), false);
});

test("Rule 1: Kerman city shipping calculation produces 100,000 Tomans PREPAID", () => {
  const result = calculateShippingInfo({
    province: "کرمان",
    city: "کرمان",
  });

  assert.equal(result.cost, 100_000);
  assert.equal(result.paymentType, "PREPAID");
  assert.equal(result.isKerman, true);
  assert.equal(result.label, "۱۰۰٬۰۰۰ تومان");
  assert.equal(calculateShippingCost({ province: "کرمان", city: "کرمان" }), 100_000);

  // Arabic Kaf variant in provinces-and-cities
  const arabicVariant = calculateShippingInfo({
    province: "کرمان",
    city: "كرمان",
  });
  assert.equal(arabicVariant.cost, 100_000);
  assert.equal(arabicVariant.paymentType, "PREPAID");
});

test("Rule 2 & 3: Other cities in Kerman province are COLLECT (پس‌کرایه) with 0 Tomans online", () => {
  const otherKermanCities = [
    "رفسنجان",
    "سیرجان",
    "سيرجان",
    "بم",
    "جیرفت",
    "جيرفت",
    "زرند",
    "کهنوج",
    "كهنوج",
  ];

  for (const city of otherKermanCities) {
    const result = calculateShippingInfo({
      province: "کرمان",
      city,
    });

    assert.equal(result.cost, 0, `Cost for ${city} should be 0`);
    assert.equal(result.paymentType, "COLLECT", `Payment type for ${city} should be COLLECT`);
    assert.equal(result.isKerman, false);
    assert.equal(result.label, COLLECT_SHIPPING_LABEL);
    assert.equal(result.description, COLLECT_SHIPPING_NOTE);
    assert.equal(calculateShippingCost({ province: "کرمان", city }), 0);
  }
});

test("Rule 2: Other provinces and cities across Iran are COLLECT (پس‌کرایه)", () => {
  const destinations = [
    { province: "تهران", city: "تهران" },
    { province: "فارس", city: "شیراز" },
    { province: "اصفهان", city: "اصفهان" },
    { province: "خراسان رضوی", city: "مشهد" },
    { province: "کرمانشاه", city: "کرمانشاه" },
  ];

  for (const dest of destinations) {
    const result = calculateShippingInfo(dest);

    assert.equal(result.cost, 0);
    assert.equal(result.paymentType, "COLLECT");
    assert.equal(result.isKerman, false);
    assert.equal(result.label, "پس‌کرایه");
    assert.equal(result.description, COLLECT_SHIPPING_NOTE);
  }
});

test("Invalid destination throws InvalidShippingDestinationError", () => {
  assert.throws(
    () => calculateShippingInfo({ province: "", city: "" }),
    InvalidShippingDestinationError,
  );
  assert.throws(
    () => calculateShippingInfo({ province: "کرمان", city: "" }),
    InvalidShippingDestinationError,
  );
  assert.throws(
    () => calculateShippingInfo({ province: "", city: "کرمان" }),
    InvalidShippingDestinationError,
  );
});

test("Rule 9: Final price formula calculation", () => {
  const itemsTotal = 500_000;
  const discount = 50_000;
  const couponDiscount = 20_000;

  // Kerman calculation: finalAmount = itemsTotal - discounts + 100000
  const kermanShipping = calculateShippingCost({ province: "کرمان", city: "کرمان" });
  const kermanFinal = itemsTotal - discount - couponDiscount + kermanShipping;
  assert.equal(kermanFinal, 500_000 - 50_000 - 20_000 + 100_000);
  assert.equal(kermanFinal, 530_000);

  // Other city (e.g. Shiraz or Rafsanjan) calculation: finalAmount = itemsTotal - discounts
  const otherShipping = calculateShippingCost({ province: "فارس", city: "شیراز" });
  const otherFinal = itemsTotal - discount - couponDiscount + otherShipping;
  assert.equal(otherFinal, 500_000 - 50_000 - 20_000);
  assert.equal(otherFinal, 430_000);

  // Price difference between Kerman and other cities is exactly 100,000 Tomans
  assert.equal(kermanFinal - otherFinal, 100_000);
});

test("Rule 2 & 7: UI display never shows '0 تومان' or 'رایگان' for COLLECT", () => {
  const collectOrder = {
    shippingCost: 0,
    shippingPaymentType: "COLLECT",
  };
  const display = formatOrderShippingDisplay(collectOrder);

  assert.equal(display.isCollect, true);
  assert.equal(display.label, "پس‌کرایه");
  assert.equal(display.subtext, COLLECT_SHIPPING_NOTE);
  assert.ok(!display.label.includes("0"));
  assert.ok(!display.label.includes("رایگان"));

  const prepaidOrder = {
    shippingCost: 100_000,
    shippingPaymentType: "PREPAID",
  };
  const prepaidDisplay = formatOrderShippingDisplay(prepaidOrder);
  assert.equal(prepaidDisplay.isCollect, false);
  assert.equal(prepaidDisplay.label, "۱۰۰٬۰۰۰ تومان");
});

test("Rule 8: Backward compatibility for legacy orders without shippingPaymentType", () => {
  // Legacy order with 0 shipping cost created before the new policy
  const legacyFreeOrder = {
    shippingCost: 0,
  };
  const legacyDisplay = formatOrderShippingDisplay(legacyFreeOrder);
  // Must NOT falsely classify as COLLECT (پس‌کرایه)
  assert.equal(legacyDisplay.isCollect, false);
  assert.notEqual(legacyDisplay.label, "پس‌کرایه");

  // Legacy order with positive shipping cost
  const legacyPaidOrder = {
    shippingCost: 50_000,
  };
  const legacyPaidDisplay = formatOrderShippingDisplay(legacyPaidOrder);
  assert.equal(legacyPaidDisplay.isCollect, false);
  assert.equal(legacyPaidDisplay.label, "۵۰٬۰۰۰ تومان");
});

test("Rule 5: Server-side security prevents client shipping tampering", () => {
  // Mock DB address
  const savedDbAddress = {
    province: "کرمان",
    city: "کرمان",
  };

  // Malicious client tries to forge shippingCost = 0 for Kerman
  const forgedClientPayload = {
    shippingCost: 0,
    shippingPaymentType: "COLLECT",
  };

  // Server ignores client-supplied values and recalculates using savedDbAddress
  const trustedShippingInfo = calculateShippingInfo({
    province: savedDbAddress.province,
    city: savedDbAddress.city,
  });

  const serverFinalPrice = 200_000 + trustedShippingInfo.cost;
  assert.equal(serverFinalPrice, 300_000);
  assert.equal(trustedShippingInfo.cost, 100_000);
  assert.equal(trustedShippingInfo.paymentType, "PREPAID");
});

test("Reactive address switching between Kerman and other city updates total immediately", () => {
  let selectedAddress = { province: "کرمان", city: "کرمان" };
  const itemsTotal = 300_000;

  // First with Kerman
  let shipping = calculateShippingInfo(selectedAddress);
  let total = itemsTotal + shipping.cost;
  assert.equal(total, 400_000);
  assert.equal(shipping.paymentType, "PREPAID");

  // User switches address to Rafsanjan
  selectedAddress = { province: "کرمان", city: "رفسنجان" };
  shipping = calculateShippingInfo(selectedAddress);
  total = itemsTotal + shipping.cost;
  assert.equal(total, 300_000);
  assert.equal(shipping.paymentType, "COLLECT");

  // User switches address to Tehran
  selectedAddress = { province: "تهران", city: "تهران" };
  shipping = calculateShippingInfo(selectedAddress);
  total = itemsTotal + shipping.cost;
  assert.equal(total, 300_000);
  assert.equal(shipping.paymentType, "COLLECT");

  // User switches back to Kerman (Arabic format)
  selectedAddress = { province: "کرمان", city: "كرمان" };
  shipping = calculateShippingInfo(selectedAddress);
  total = itemsTotal + shipping.cost;
  assert.equal(total, 400_000);
  assert.equal(shipping.paymentType, "PREPAID");
});
