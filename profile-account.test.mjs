import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import moment from "moment-jalaali";
import mongoose from "mongoose";

const compile = async (path) => ts.transpileModule(await readFile(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const compiled = await compile("app/api/profile/account/route.ts");

function harness({ authenticated = true, found = true } = {}) {
  const calls = [];
  const user = { _id: "user-id", username: "User", mobile: "09123456789", email: "user@example.test",
    birthday: new Date("2000-03-20"), newsletter: false, nationalCode: "legacy-private-value" };
  const projected = (projection) => Object.fromEntries(Object.entries(user).filter(([key]) => projection[key]));
  const models = {
    findOne(filter) {
      calls.push({ kind: "read", filter });
      return { select(fields) {
        calls.at(-1).projection = fields;
        return found ? { ...user, toObject: () => projected(Object.fromEntries(fields.split(" ").map((key) => [key, 1]))) } : null;
      } };
    },
    async findOneAndUpdate(filter, update, options) {
      calls.push({ kind: "write", filter, update, options });
      Object.assign(user, update);
      return found ? projected(options.projection) : null;
    },
  };
  const mocks = {
    "@/lib/mongodb": async () => {}, "@/model/User": models,
    "next-auth": { getServerSession: async () => authenticated ? { user: { mobile: user.mobile } } : null },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    "moment-jalaali": moment,
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, console,
    require: (name) => { assert.ok(Object.hasOwn(mocks, name), name); return mocks[name]; } });
  return { ...module.exports, calls };
}
const request = (data) => ({ json: async () => data });

test("profile GET returns public account fields without legacy identity data", async () => {
  const { GET, calls } = harness();
  const response = await GET();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.username, "User");
  assert.equal(body.birthday, "۱۳۷۹-۰۱-۰۱");
  assert.equal(Object.hasOwn(body, "nationalCode"), false);
  assert.equal(calls[0].filter.mobile, "09123456789");
  assert.ok(!calls[0].projection.split(" ").includes("nationalCode"));
});

test("profile PUT ignores old clients' identity fields and preserves supported edits", async () => {
  const { PUT, calls } = harness();
  const response = await PUT(request({ username: "Updated", email: "new@example.test", gender: "مرد",
    birthday: "۱۳۷۹-۰۱-۰۱", newsletter: false, nationalCode: "do-not-save", role: "superadmin" }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.user.username, "Updated");
  assert.equal(body.user.newsletter, false);
  assert.equal(calls[0].update.birthday, "2000-03-20");
  assert.equal(Object.hasOwn(calls[0].update, "nationalCode"), false);
  assert.equal(Object.hasOwn(calls[0].update, "role"), false);
  assert.equal(Object.hasOwn(body.user, "nationalCode"), false);
  assert.equal(calls[0].options.returnDocument, "after");
});

test("profile endpoints still require login and handle missing users", async () => {
  const guest = harness({ authenticated: false });
  assert.equal((await guest.GET()).status, 401);
  assert.equal((await guest.PUT(request({}))).status, 401);
  assert.equal(guest.calls.length, 0);
  const missing = harness({ found: false });
  assert.equal((await missing.GET()).status, 404);
  assert.equal((await missing.PUT(request({ username: "Updated" }))).status, 404);
});

test("User schema cannot persist removed identity fields", async () => {
  const module = { exports: {} };
  vm.runInNewContext(await compile("model/User.ts"), { exports: module.exports,
    require: (name) => {
      if (name === "mongoose") return mongoose;
      if (name === "@/types/loyalty") return { VIP_TIERS: [] };
      throw new Error(`Unexpected dependency: ${name}`);
    } });
  const User = module.exports.default;
  const user = new User({ mobile: "09123456789", nationalCode: "do-not-save" });
  assert.equal(User.schema.path("nationalCode"), undefined);
  assert.equal(Object.hasOwn(user.toObject(), "nationalCode"), false);
});
