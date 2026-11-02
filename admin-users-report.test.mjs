import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile("app/api/admin/user/route.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

async function requestReport({ users = [], orderStats = [], orderCount = 0, role = "superadmin" } = {}) {
  const calls = [];
  const query = {
    sort() { return this; }, skip() { return this; }, limit() { return this; },
    select() { return this; }, populate() { return this; },
    async lean() { return users; },
  };
  const userModel = {
    find() { return query; },
    async countDocuments() { return users.length; },
    async aggregate() {
      return [{ totalUsers: users.length, regularUsers: users.length, admins: 0,
        missingVerificationRecords: users.filter((user) => !(user.phoneVerifiedAt instanceof Date)).length }];
    },
  };
  const orderModel = {
    async countDocuments(filter) { calls.push({ kind: "count", filter }); return orderCount; },
    async aggregate(pipeline) { calls.push({ kind: "aggregate", pipeline }); return orderStats; },
  };
  const emptyModel = { async aggregate() { return []; }, async countDocuments() { return 0; } };
  const favoriteQuery = { ...query, async lean() { return []; } };
  const mocks = {
    "@/lib/mongodb": async () => {},
    "next-auth": { getServerSession: async () => role ? { user: { role } } : null },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/model/User": userModel,
    "@/model/Order": orderModel,
    "@/model/Address": emptyModel,
    "@/model/Comment": emptyModel,
    "@/model/Favorite": { find() { return favoriteQuery; } },
    "@/model/Product": {},
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports, Date, URL, Request, Response,
    require: (id) => {
      assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
      return mocks[id];
    },
  });
  const response = await module.exports.GET(new Request("https://example.test/api/admin/user"));
  return { status: response.status, data: await response.json(), calls };
}

test("deleted orders cannot leak stale loyalty purchase counters into the user report", async () => {
  const { data, calls } = await requestReport({ users: [{ _id: "manager", successfulOrders: 3, totalPurchase: 4800 }] });
  assert.equal(data.summary.successfulOrders, 0);
  assert.equal(data.users[0].successfulOrders, 0);
  assert.equal(data.users[0].totalPurchase, 0);
  for (const call of calls) {
    const filter = call.filter ?? call.pipeline[0].$match;
    assert.equal(filter.paymentStatus, "paid");
    assert.deepEqual(Array.from(filter.status.$in), ["pending", "processing", "shipped", "delivered"]);
  }
  assert.equal(calls[0].filter.user.$type, "objectId");
  assert.deepEqual(Array.from(calls[1].pipeline[0].$match.user.$in), ["manager"]);
});

test("current purchases belong to their owner and the global count is independent of the page", async () => {
  const { data } = await requestReport({
    users: [{ _id: "buyer" }, { _id: "other", totalPurchase: 9999 }],
    orderStats: [{ _id: "buyer", successfulOrders: 2, totalPurchase: 250000 }],
    orderCount: 7,
  });
  assert.equal(data.summary.successfulOrders, 7);
  assert.equal(data.users[0].successfulOrders, 2);
  assert.equal(data.users[0].totalPurchase, 250000);
  assert.equal(data.users[1].totalPurchase, 0);
});

test("legacy and null verification records remain unknown, while OTP dates prove verification", async () => {
  const users = [{ _id: "legacy" }, { _id: "null", phoneVerifiedAt: null },
    { _id: "verified", phoneVerifiedAt: new Date("2026-11-02T13:09:36Z") }];
  const { data } = await requestReport({ users });
  assert.deepEqual(data.users.map((user) => user.phoneVerificationStatus), ["no_record", "no_record", "verified"]);
  assert.equal(data.summary.missingVerificationRecords, 2);
  assert.ok(users[0].phoneVerifiedAt === undefined);
});

test("an empty database returns usable zero totals without user-detail queries", async () => {
  const { data, calls } = await requestReport();
  assert.deepEqual(data.users, []);
  assert.equal(data.summary.successfulOrders, 0);
  assert.equal(data.pages, 1);
  assert.equal(calls.length, 1);
});

test("purchase reports remain restricted to superadmins", async () => {
  for (const [role, status] of [[null, 401], ["user", 403], ["admin", 403]]) {
    const result = await requestReport({ role });
    assert.equal(result.status, status);
    assert.equal(result.calls.length, 0);
  }
});
