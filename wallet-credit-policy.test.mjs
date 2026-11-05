import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";

const source = await readFile("lib/loyalty/wallet-credit.policy.ts", "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Date, Math });
const { spendExpiringCreditFirst, zeroExpiredCredits } = exports;
const now = new Date("2026-11-05T10:00:00.000Z");
test("wallet checkout spends bonus expiring soonest, before paid-in wallet funds", () => {
  const credits = [
    { amount: 50000, expiresAt: new Date("2026-11-08T10:00:00Z"), sourceKey: "welcome" },
    { amount: 10000, expiresAt: new Date("2026-11-09T10:00:00Z"), sourceKey: "other" },
  ];
  const after = spendExpiringCreditFirst(credits, 55000, now);
  assert.equal(after[0].amount, 0);
  assert.equal(after[1].amount, 5000);
  assert.equal(credits[0].amount, 50000);
  const expired = zeroExpiredCredits(after, new Date("2026-11-08T10:00:00Z"));
  assert.equal(expired.amount, 0);
  assert.equal(expired.credits[1].amount, 5000);
});
test("expired credit cannot be spent and is removed at exactly 72 hours", () => {
  const expiredAt = new Date("2026-11-08T10:00:00Z");
  const credits = [{ amount: 50000, expiresAt: expiredAt, sourceKey: "welcome" }];
  assert.equal(spendExpiringCreditFirst(credits, 25000, expiredAt)[0].amount, 50000);
  const zero = zeroExpiredCredits(credits, expiredAt);
  assert.equal(zero.amount, 50000);
  assert.equal(zero.credits[0].amount, 0);
});

test("unreconciled legacy gifts never claw back paid-in funds", () => {
  const legacy = [{ amount: 50000, expiresAt: new Date("2026-11-04T10:00:00Z") }];
  const result = zeroExpiredCredits(legacy, now);
  assert.equal(result.amount, 0);
  assert.equal(result.credits[0].amount, 50000);
});
