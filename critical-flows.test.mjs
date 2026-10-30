import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  attachNewAddressToAppointmentDraft,
  readAppointmentDraft,
  saveAppointmentDraft,
} from "./lib/appointments/draft.ts";
import { courierReturnDeliveryProgress } from "./lib/appointments/policy.ts";
import { profileRoute } from "./lib/profileRoutes.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("courier address navigation always targets Addresses, never Favorites", async () => {
  assert.equal(profileRoute("addresses"), "/my-profile?step=3");
  const source = await readFile("app/(public)/my-profile/GameOrderSelector.tsx", "utf8");
  assert.match(source, /profileRoute\("addresses"\)/);
  assert.doesNotMatch(source, /افزودن آدرس[\s\S]{0,200}step=2/);
});

test("courier draft survives address creation and selects the new owned address", () => {
  const storage = memoryStorage();
  saveAppointmentDraft(storage, {
    step: 3,
    serviceType: "repair",
    device: "ps5",
    installationType: "",
    repairIssue: "power",
    fulfillment: "courier",
    description: "خاموش می‌شود",
    selectedDate: "2026-11-01",
    selectedSlot: null,
    selectedCourierWindow: { start: "10:00", end: "12:00" },
    selectedAddressId: "",
    selectedRewardId: "",
    customerName: "کاربر نمونه",
    phone: "09123456789",
    idempotencyKey: "request-key",
  });
  attachNewAddressToAppointmentDraft(storage, "address-2");
  const restored = readAppointmentDraft(storage);
  assert.equal(restored?.step, 3);
  assert.equal(restored?.device, "ps5");
  assert.equal(restored?.newAddressId, "address-2");
});

test("business SMS is post-commit, idempotent, and cannot roll back the order", async () => {
  const [createRoute, statusRoute, smsService, provider] = await Promise.all([
    readFile("app/api/admin/store-order/route.ts", "utf8"),
    readFile("app/api/admin/store-order/changestatus/[orderId]/route.ts", "utf8"),
    readFile("lib/sms/business.ts", "utf8"),
    readFile("helpers/CustomerSms.ts", "utf8"),
  ]);
  assert.match(createRoute, /StoreOrder\.create[\s\S]+deliverBusinessSms/);
  assert.doesNotMatch(createRoute, /StoreOrder\.deleteOne/);
  assert.match(statusRoute, /deliveryStatus: existing\.deliveryStatus/);
  assert.match(smsService, /eventKey: input\.eventKey/);
  assert.match(smsService, /attempts: 0/);
  assert.doesNotMatch(provider, /cba17fa/);
});

test("OTP autofill, paste, and manual submit share one verifier", async () => {
  const [client, route] = await Promise.all([
    readFile("app/(public)/auth/login/page.tsx", "utf8"),
    readFile("app/api/verifyOtp/route.ts", "utf8"),
  ]);
  assert.match(client, /verifyOtpCode\(otpCode\)/);
  assert.match(client, /verifyOtpCode\(code\)/);
  assert.match(client, /verifyOtpCode\(enteredOtp\)/);
  assert.match(client, /autoComplete="one-time-code"/);
  assert.match(route, /createdAt: \{ \$gt:/);
  assert.match(route, /\[٠-٩\]/);
});

test("return delivery presentation maps legacy courier states into three safe stages", () => {
  assert.equal(courierReturnDeliveryProgress("at_store"), 0);
  assert.equal(courierReturnDeliveryProgress("return_ready"), 1);
  assert.equal(courierReturnDeliveryProgress("returning"), 2);
  assert.equal(courierReturnDeliveryProgress("delivered"), 3);
});
