import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = "a".repeat(24);
const mobile = "09123456789";
const referralPolicy = await import("./lib/loyalty/referral.policy.ts");

function load(path, dependencies) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  new Function("require", "module", "exports", outputText)(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), module, module.exports,
  );
  return module.exports;
}

function orderHarness({ existingUser, rejectOrder = false } = {}) {
  let user = existingUser;
  let smsCount = 0;
  const databaseSession = {};
  const User = {
    init: async () => {},
    async updateOne(filter, update, options) {
      assert.deepEqual(filter, { mobile });
      assert.deepEqual(Object.keys(update), ["$setOnInsert"]);
      assert.equal(options.session, databaseSession);
      assert.equal(options.upsert, true);
      user ??= update.$setOnInsert;
    },
  };
  class StoreOrder {
    static findOne() { return { populate: async () => null }; }
    _id = id;
    createdAt = new Date();
    async save({ session }) {
      assert.equal(session, databaseSession);
      if (rejectOrder) throw new Error("simulated order write failure");
      return this;
    }
    $session(value) { assert.equal(value, null); }
    async populate() {}
  }
  const mongoose = {
    isValidObjectId: () => true,
    connection: {
      async transaction(callback) {
        const before = user;
        try { return await callback(databaseSession); }
        catch (error) { user = before; throw error; }
      },
    },
  };
  const account = load("./lib/store-customer-account.ts", { "@/model/User": User });
  const route = load("./app/api/admin/store-order/route.ts", {
    mongoose,
    "next-auth": { getServerSession: async () => ({ user: { role: "admin" } }) },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/mongodb": async () => {},
    "@/model/Appointment": {},
    "@/lib/appointments/store-order": {},
    "@/model/StoreOrder": StoreOrder,
    "@/model/User": User,
    "@/model/Customer": { findById: () => ({ lean: async () => ({ name: "رامتین", lastName: "زند خاوری", mobile }) }) },
    "@/lib/store-customer-account": account,
    "@/lib/sms/store-order": { sendStoreOrderReceiptSms: async () => { smsCount++; } },
  });
  return {
    submit: () => route.POST(new Request("http://localhost/api/admin/store-order", {
      method: "POST",
      headers: { "Idempotency-Key": "manual-order-12345678" },
      body: JSON.stringify({ customerId: id, price: 1000, consoleType: "ps5", list: [{ name: "Game", price: 1000, size: 2 }] }),
    })),
    get user() { return user; },
    get smsCount() { return smsCount; },
  };
}

test("manual order provisions a regular website account with an unverified mobile and both names", async () => {
  const harness = orderHarness();
  assert.equal((await harness.submit()).status, 201);
  assert.equal(harness.user.mobile, mobile);
  assert.equal(harness.user.firstName, "رامتین");
  assert.equal(harness.user.lastName, "زند خاوری");
  assert.equal(harness.user.username, "رامتین زند خاوری");
  assert.equal(harness.user.role, "user");
  assert.equal(harness.user.storeOrderPendingSignup, true);
  assert.equal(harness.user.phoneVerifiedAt, undefined);
  assert.equal(harness.user.registrationCompletedAt, undefined);
  assert.equal(harness.smsCount, 1);
});

test("manual order preserves an existing account for the same phone and rolls back on a failed order", async () => {
  const existingUser = { role: "user", username: "نام انتخابی", phoneVerifiedAt: new Date() };
  const repeat = orderHarness({ existingUser });
  assert.equal((await repeat.submit()).status, 201);
  assert.equal(repeat.user, existingUser);

  const failed = orderHarness({ rejectOrder: true });
  assert.equal((await failed.submit()).status, 500);
  assert.equal(failed.user, undefined);
  assert.equal(failed.smsCount, 0);
});

test("only successful OTP verification activates a store-created account and applies signup benefits", async () => {
  let user = { _id: id, mobile, username: "رامتین زند خاوری", storeOrderPendingSignup: true };
  const referrals = [];
  const registrations = [];
  const route = load("./app/api/verifyOtp/route.ts", {
    "@/lib/mongodb": async () => {},
    "@/model/Otp": {
      findOneAndUpdate: async ({ otp }) => otp === "12345"
        ? { mobile, referralCode: "KA-123ABC", signupIntentId: "signup-intent" } : null,
    },
    "@/model/User": {
      findOne: async () => user,
      async findOneAndUpdate(filter, update) {
        assert.deepEqual(filter, { _id: id, storeOrderPendingSignup: true });
        user = { ...user, ...update.$set };
        delete user.storeOrderPendingSignup;
        return user;
      },
      async updateOne(_, update) {
        user = { ...user, ...update.$set };
        if (update.$unset?.signupIntentId) delete user.signupIntentId;
      },
    },
    "@/lib/notifications/service": { notifyAdmins: async (notice) => registrations.push(notice) },
    "@/lib/loyalty/referral.policy": referralPolicy,
    "@/lib/loyalty/purchase.hooks": {
      onUserSignup: async (_, referral) => {
        referrals.push(referral);
        return { code: { ok: true }, xp: { ok: true }, referral: { ok: true, retryable: false } };
      },
    },
  });
  const verify = (enteredOtp) => route.POST(new Request("http://localhost/api/verifyOtp", {
    method: "POST", body: JSON.stringify({ otpId: id, enteredOtp }),
  }));

  assert.equal((await verify("00000")).status, 400);
  assert.equal(user.phoneVerifiedAt, undefined);
  assert.equal(referrals.length, 0);

  assert.equal((await verify("12345")).status, 200);
  assert.ok(user.phoneVerifiedAt instanceof Date);
  assert.ok(user.registrationCompletedAt instanceof Date);
  assert.equal(user.storeOrderPendingSignup, undefined);
  assert.equal(user.username, "رامتین زند خاوری");
  assert.equal((await verify("12345")).status, 200);
  assert.deepEqual(referrals, ["KA-123ABC"]);
  assert.equal(registrations.length, 1);
});
