import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const options = {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
};

const [route, policy] = await Promise.all(
  ["app/api/verifyOtp/route.ts", "lib/loyalty/referral.policy.ts"].map(async (path) =>
    ts.transpileModule(await readFile(path, "utf8"), options).outputText,
  ),
);

function setup(user) {
  let ticket = {
    _id: "1234567890abcdef12345678",
    mobile: "09123456789",
    otp: "12345",
    createdAt: new Date(),
    referralCode: "KA-ABC123",
    signupIntentId: "signup-intent",
  };
  const signups = [];
  const notifications = [];
  const referralPolicy = {};
  vm.runInNewContext(policy, { exports: referralPolicy });
  const mocks = {
    "@/lib/mongodb": async () => {},
    "@/lib/loyalty/referral.policy": referralPolicy,
    "@/lib/loyalty/purchase.hooks": {
      onUserSignup: async (id, code) => {
        signups.push({ id, code });
        return { code: { ok: true }, xp: { ok: true }, referral: { ok: true, retryable: false } };
      },
    },
    "@/lib/notifications/service": {
      notifyAdmins: async (notification) => notifications.push(notification),
    },
    "@/model/Otp": {
      async findOneAndUpdate(filter, update) {
        if (filter._id !== ticket._id || filter.otp !== ticket.otp ||
            ticket.verifiedAt || ticket.createdAt <= filter.createdAt.$gt) return null;
        const { otp, ...remaining } = ticket;
        assert.equal(update.$unset.otp, 1);
        ticket = { ...remaining, ...update.$set };
        return { ...ticket };
      },
      async findOne(filter) {
        if (filter._id !== ticket._id || filter.registrationTokenHash !== ticket.registrationTokenHash ||
            !ticket.verifiedAt || ticket.verifiedAt > filter.verifiedAt.$lte ||
            !(ticket.registrationTokenExpiresAt > filter.registrationTokenExpiresAt.$gt)) return null;
        return { ...ticket };
      },
      async updateOne(filter, update) {
        assert.equal(filter._id, ticket._id);
        Object.assign(ticket, update.$set);
        return { matchedCount: 1 };
      },
    },
    "@/model/User": {
      findOne: async ({ mobile }) => mobile === ticket.mobile && user ? { ...user } : null,
      async create(fields) {
        assert.equal(fields.mobile, ticket.mobile);
        assert.equal(user, undefined);
        user = { _id: "new-user", ...fields };
        return { ...user };
      },
      async updateOne(filter, update) {
        assert.equal(filter._id, user._id);
        Object.assign(user, update.$set);
        if (update.$unset?.signupIntentId) delete user.signupIntentId;
      },
    },
    "node:crypto": crypto,
  };

  const exports = {};
  vm.runInNewContext(route, { exports, Response, require: (id) => mocks[id] });
  const post = (body) => exports.POST(new Request("http://localhost/api/verifyOtp", {
    method: "POST",
    body: JSON.stringify({ otpId: ticket._id, ...body }),
  }));
  return {
    verify: () => post({ enteredOtp: "۱۲۳۴۵" }),
    complete: (registrationToken, firstName, lastName) =>
      post({ registrationToken, firstName, lastName, mobile: "09000000000" }),
    getUser: () => user,
    getTicket: () => ticket,
    signups,
    notifications,
  };
}

test("a new mobile must finish the name form before account creation and login", async () => {
  const flow = setup();
  const challenge = await (await flow.verify()).json();

  assert.equal(challenge.requiresRegistration, true);
  assert.equal(challenge.verificationToken, undefined);
  assert.equal(flow.getTicket().loginTokenHash, undefined);
  assert.equal(flow.getUser(), undefined);
  assert.deepEqual(flow.notifications, []);
  assert.deepEqual(flow.signups, []);

  for (const [firstName, lastName] of [[" ", "زند"], ["رامتین", ""], ["رامتین۱", "زند"]]) {
    assert.equal((await flow.complete(challenge.registrationToken, firstName, lastName)).status, 400);
  }
  assert.equal(flow.getUser(), undefined);

  const completed = await (await flow.complete(challenge.registrationToken, " رامتین ", "زند‌خاوری")).json();
  assert.equal(completed.success, true);
  assert.equal(completed.referral.ok, true);
  assert.equal(
    flow.getTicket().loginTokenHash,
    crypto.createHash("sha256").update(completed.verificationToken).digest("hex"),
  );
  assert.equal(flow.getUser().mobile, "09123456789");
  assert.equal(flow.getUser().firstName, "رامتین");
  assert.equal(flow.getUser().lastName, "زند‌خاوری");
  assert.equal(flow.getUser().username, "رامتین زند‌خاوری");
  assert.equal(flow.getUser().phoneVerifiedAt, flow.getTicket().verifiedAt);
  assert.equal(flow.notifications.length, 1);
  assert.deepEqual(flow.signups, [{ id: "new-user", code: "KA-ABC123" }]);

  assert.equal((await flow.complete(challenge.registrationToken, "نام", "دیگر")).status, 200);
  assert.equal(flow.getUser().firstName, "رامتین");
  assert.equal(flow.notifications.length, 1);
  assert.equal(flow.signups.length, 1);
});

test("forged and expired registration tokens cannot create accounts", async () => {
  const flow = setup();
  const { registrationToken } = await (await flow.verify()).json();

  assert.equal((await flow.complete("x".repeat(43), "رامتین", "زند")).status, 401);
  flow.getTicket().registrationTokenExpiresAt = new Date(0);
  assert.equal((await flow.complete(registrationToken, "رامتین", "زند")).status, 401);
  assert.equal(flow.getUser(), undefined);
  assert.equal(flow.getTicket().loginTokenHash, undefined);
});

test("a legacy account with no names still receives a login token directly", async () => {
  const flow = setup({ _id: "legacy", mobile: "09123456789", username: "کاربر" });
  const result = await (await flow.verify()).json();

  assert.equal(result.success, true);
  assert.ok(result.verificationToken);
  assert.equal(result.requiresRegistration, undefined);
  assert.equal(result.registrationToken, undefined);
  assert.equal(flow.getUser().firstName, undefined);
  assert.equal(flow.getUser().username, "کاربر");
  assert.equal(flow.notifications.length, 0);
  assert.equal(flow.signups.length, 0);
});
