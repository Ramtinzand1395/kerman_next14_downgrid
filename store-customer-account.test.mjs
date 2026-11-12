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

function loadOrderRoute({ mongoose, User, StoreOrder, Customer, sendStoreOrderReceiptSms }) {
  const account = load("./lib/store-customer-account.ts", { "@/model/User": User });
  return load("./app/api/admin/store-order/route.ts", {
    mongoose,
    "next-auth": { getServerSession: async () => ({ user: { role: "admin" } }) },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/mongodb": async () => {},
    "@/model/Appointment": {},
    "@/lib/appointments/store-order": {},
    "@/model/StoreOrder": StoreOrder,
    "@/model/User": User,
    "@/model/Customer": Customer,
    "@/lib/store-customer-account": account,
    "@/lib/sms/store-order": { sendStoreOrderReceiptSms },
  });
}

function manualOrderRequest(customerId = id) {
  return new Request("http://localhost/api/admin/store-order", {
    method: "POST",
    headers: { "Idempotency-Key": "manual-order-12345678" },
    body: JSON.stringify({ customerId, price: 1000, consoleType: "ps5", list: [{ name: "Game", price: 1000, size: 2 }] }),
  });
}

function orderHarness({ existingUser, rejectOrder = false, standalone = false, rejectAccountOnce = false } = {}) {
  let user = existingUser;
  let smsCount = 0;
  let savedOrder;
  let orderWrites = 0;
  const customer = { name: "رامتین", lastName: "زند خاوری", mobile };
  const databaseSession = {};
  const User = {
    init: async () => {},
    async updateOne(filter, update, options) {
      assert.equal(filter.mobile, mobile);
      assert.equal(options.session, standalone ? undefined : databaseSession);
      if (update.$set) {
        assert.equal(filter.role, "user");
        for (const [field, value] of Object.entries(update.$set)) {
          if (user?.role === "user" && !user[field]) user = { ...user, [field]: value };
        }
        return { upsertedCount: 0 };
      }
      if (rejectAccountOnce) {
        rejectAccountOnce = false;
        throw new Error("simulated account write failure");
      }
      assert.equal(options.upsert, true);
      if (user) return { upsertedCount: 0 };
      user = update.$setOnInsert;
      return { upsertedCount: 1 };
    },
  };
  class StoreOrder {
    static findOne() { return { populate: async () => savedOrder }; }
    static async init() {}
    static async updateOne() { savedOrder.websiteAccountSyncPending = undefined; }
    constructor(fields) { Object.assign(this, fields); }
    _id = id;
    createdAt = new Date();
    async save({ session } = {}) {
      assert.equal(session, standalone ? undefined : databaseSession);
      if (rejectOrder) throw new Error("simulated order write failure");
      orderWrites++;
      savedOrder = this;
      return this;
    }
    $session(value) { assert.equal(value, null); }
    async populate() { this.customer = customer; }
  }
  const mongoose = {
    isValidObjectId: () => true,
    connection: {
      async transaction(callback) {
        if (standalone) {
          const error = new Error("This MongoDB deployment does not support retryable writes.");
          error.originalError = Object.assign(new Error("Transaction numbers are only allowed on a replica set member or mongos"), { code: 20 });
          throw error;
        }
        const before = user;
        try { return await callback(databaseSession); }
        catch (error) { user = before; throw error; }
      },
    },
  };
  const route = loadOrderRoute({
    mongoose, User, StoreOrder,
    Customer: { findById: () => ({ lean: async () => customer }) },
    sendStoreOrderReceiptSms: async () => { smsCount++; },
  });
  return {
    submit: () => route.POST(manualOrderRequest()),
    get orderWrites() { return orderWrites; },
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
  const existingUser = { role: "user", username: "نام انتخابی", firstName: "نام قبلی", phoneVerifiedAt: new Date() };
  const repeat = orderHarness({ existingUser });
  assert.equal((await repeat.submit()).status, 201);
  assert.deepEqual(repeat.user, { ...existingUser, lastName: "زند خاوری" });

  const failed = orderHarness({ rejectOrder: true });
  assert.equal((await failed.submit()).status, 500);
  assert.equal(failed.user, undefined);
  assert.equal(failed.smsCount, 0);
});

test("standalone saves the order first and a repeat completes a failed account sync without duplicating it", async () => {
  const harness = orderHarness({ standalone: true, rejectAccountOnce: true });
  assert.equal((await harness.submit()).status, 503);
  assert.equal(harness.orderWrites, 1);
  assert.equal(harness.user, undefined);
  assert.equal(harness.smsCount, 0);

  const retry = await harness.submit();
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).replayed, true);
  assert.equal(harness.user.mobile, mobile);
  assert.equal(harness.orderWrites, 1);
  assert.equal(harness.smsCount, 1);
  assert.equal((await harness.submit()).status, 200);
  assert.equal(harness.smsCount, 1);
});

test("real standalone MongoDB registers an order and website account with retryWrites enabled", {
  skip: process.env.STORE_CUSTOMER_ACCOUNT_MONGO_TESTS !== "true",
}, async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const { Mongoose } = await import("mongoose");
  const mongoose = new Mongoose();
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: { ip: "127.0.0.1", args: ["--nounixsocket"] },
  });
  try {
    const uri = new URL(mongo.getUri("store_account_standalone"));
    assert.equal(uri.hostname, "127.0.0.1");
    uri.searchParams.set("retryWrites", "true");
    await mongoose.connect(uri.toString());
    const User = load("./model/User.ts", {
      mongoose: { __esModule: true, default: mongoose, Schema: mongoose.Schema, model: mongoose.model.bind(mongoose) },
      "@/types/loyalty": { VIP_TIERS: ["bronze", "silver", "gold"] },
    }).default;
    const Customer = load("./model/Customer.ts", { mongoose }).default;
    const StoreOrder = load("./model/StoreOrder.ts", { mongoose }).default;
    assert.equal(User.collection.name, "users");
    const customer = await Customer.create({ name: "رامتین", lastName: "زند خاوری", sex: "مرد", mobile: "۰۹۱۲۳۴۵۶۷۸۹" });
    const route = loadOrderRoute({
      mongoose, User, StoreOrder, Customer, sendStoreOrderReceiptSms: async () => null,
    });
    const result = await route.POST(manualOrderRequest(String(customer._id)));
    assert.equal(result.status, 201, await result.clone().text());
    assert.equal(await StoreOrder.countDocuments(), 1);
    const account = await User.findOne({ mobile }).lean();
    assert.equal(account.firstName, "رامتین");
    assert.equal(account.lastName, "زند خاوری");
    assert.equal(account.phoneVerifiedAt, undefined);
    // Reconcile orders saved before website account creation was deployed.
    await User.deleteOne({ mobile });
    const replay = await route.POST(manualOrderRequest(String(customer._id)));
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replayed, true);
    assert.equal(await StoreOrder.countDocuments(), 1);
    assert.equal(await User.countDocuments(), 1);

    const oldCustomer = await Customer.create({ name: "علی", lastName: "رضایی", sex: "مرد", mobile: "+98 912 345 6780" });
    const manualSync = load("./app/api/admin/store-order/customer/[customerId]/website-account/route.ts", {
      mongoose,
      "next-auth": { getServerSession: async () => ({ user: { role: "admin" } }) },
      "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
      "@/lib/mongodb": async () => {},
      "@/model/Customer": Customer,
      "@/model/User": User,
      "@/lib/store-customer-account": load("./lib/store-customer-account.ts", { "@/model/User": User }),
    });
    const sync = await manualSync.POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ customerId: String(oldCustomer._id) }),
    });
    assert.equal(sync.status, 200);
    const syncedAccount = await User.collection.findOne({ mobile: "09123456780" });
    assert.equal(syncedAccount.firstName, "علی");
    assert.equal(syncedAccount.lastName, "رضایی");
    assert.equal(await StoreOrder.countDocuments(), 1);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test("only successful OTP verification activates a store-created account and applies signup benefits", async () => {
  let user = { _id: id, mobile, username: "رامتین زند خاوری", firstName: "رامتین", lastName: "زند خاوری", storeOrderPendingSignup: true };
  const referrals = [];
  const registrations = [];
  const route = load("./app/api/verifyOtp/route.ts", {
    "@/lib/mongodb": async () => {},
    "@/model/Otp": {
      findOneAndUpdate: async ({ otp }) => otp === "12345"
        ? { _id: id, mobile, verifiedAt: new Date(), referralCode: "KA-123ABC", signupIntentId: "signup-intent" } : null,
      updateOne: async () => ({ matchedCount: 1 }),
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
