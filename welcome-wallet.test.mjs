import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";

const source = await readFile("lib/loyalty/welcome-gift.policy.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, Date, Number });
const { welcomeGiftOffer } = exports;
const registeredAt = new Date("2026-11-06T10:00:00.000Z");
const base = {
  enabled: true,
  amount: 50000,
  registeredAt,
  startAt: "2026-11-06T00:00:00.000Z",
  now: new Date("2026-11-07T10:00:00.000Z"),
};

test("signup receives exactly 72 hours of bounded welcome credit", () => {
  const gift = welcomeGiftOffer(base);
  assert.equal(gift.amount, 50000);
  assert.equal(gift.expiresAt.toISOString(), "2026-11-09T10:00:00.000Z");
  assert.equal(welcomeGiftOffer({ ...base, now: new Date("2026-11-09T10:00:00.000Z") }), null);
});
test("legacy signups, invalid configuration, and disabled promotions do not get a gift", () => {
  for (const overrides of [
    { enabled: false },
    { startAt: undefined },
    { startAt: "invalid" },
    { startAt: "2026-11-07T00:00:00.000Z" },
    { amount: 0 },
    { amount: 500000 },
    { now: new Date("2026-11-05T00:00:00.000Z") },
    { endAt: "2026-11-06T10:00:00.000Z" },
  ]) {
    assert.equal(welcomeGiftOffer({ ...base, ...overrides }), null);
  }
});
