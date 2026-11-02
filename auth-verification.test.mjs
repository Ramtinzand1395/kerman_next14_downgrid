import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";

const compiled = ts.transpileModule(await readFile("app/api/auth/[...nextauth]/options.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function harness(ticket, writeError) {
  const calls = [];
  const mocks = {
    "@/lib/mongodb": async () => {},
    "@/model/Otp": { findOneAndDelete(filter) { calls.push({ filter }); return { lean: async () => ticket }; } },
    "@/model/User": { findOneAndUpdate(filter, update, options) {
      calls.push({ filter, update, options });
      return { lean: async () => {
        if (writeError) throw writeError;
        return { _id: "user-id", mobile: ticket.mobile, role: "user" };
      } };
    } },
    "node:crypto": { createHash },
    "next-auth/providers/credentials": (options) => options,
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, Date, process: { env: {} },
    require: (name) => { assert.ok(Object.hasOwn(mocks, name)); return mocks[name]; } });
  return { authorize: module.exports.authOptions.providers[0].authorize, calls };
}

test("OTP-backed login persists legacy verification before returning a session identity", async () => {
  const verifiedAt = new Date("2026-11-02T13:00:00Z");
  const { authorize, calls } = harness({ mobile: "09123456789", verifiedAt });
  assert.equal((await authorize({ verificationToken: "one-use-ticket" })).id, "user-id");
  assert.equal(calls[0].filter.verifiedAt.$type, "date");
  assert.ok(calls[0].filter.loginTokenExpiresAt.$gt instanceof Date);
  assert.equal(calls[1].filter.mobile, "09123456789");
  assert.equal(calls[1].options.returnDocument, "after");
  for (const field of ["phoneVerifiedAt", "registrationCompletedAt"]) {
    const condition = calls[1].update[0].$set[field].$cond;
    assert.equal(condition[0].$eq[1], "date");
    assert.equal(condition[1], `$${field}`); // preserve existing historical dates
    assert.equal(condition[2], verifiedAt); // only actual OTP evidence may fill a gap
  }
});

test("missing credentials, expired tickets and invalid verification evidence cannot write users", async () => {
  for (const ticket of [null, { mobile: "09123456789", verifiedAt: null },
    { mobile: "09123456789", verifiedAt: new Date("invalid") },
    { mobile: "invalid", verifiedAt: new Date() }]) {
    const { authorize, calls } = harness(ticket);
    await assert.rejects(authorize({ verificationToken: "invalid-ticket" }));
    assert.equal(calls.length, 1);
  }
  const { authorize, calls } = harness(null);
  await assert.rejects(authorize({}));
  assert.equal(calls.length, 0);
});

test("verification write failure blocks login rather than issuing a session", async () => {
  const { authorize } = harness({ mobile: "09123456789", verifiedAt: new Date() }, new Error("DB unavailable"));
  await assert.rejects(authorize({ verificationToken: "valid-ticket" }), /DB unavailable/);
});
