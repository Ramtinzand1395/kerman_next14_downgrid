import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import mongoose from "mongoose";
import ts from "typescript";

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Buffer,
    process: { env: { GAME_ACCOUNT_SECRET: "local regression-test key" } },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
  });
  return exports;
}

test("the game-account API returns only the signed-in owner's delivered credentials", async () => {
  const owner = new mongoose.Types.ObjectId();
  const otherOwner = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  const itemId = new mongoose.Types.ObjectId();
  const item = {
    _id: itemId,
    product: new mongoose.Types.ObjectId(),
    productTitle: "Game",
    productImage: "/game.webp",
    variantTitle: "PS5 / ظرفیت ۲",
    isOnlineGame: true,
    quantity: 3,
  };
  const legacyItem = { ...item, _id: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId(), quantity: 1, productTitle: null, productImage: null, variantTitle: null };
  const legacySlot = [orderId, legacyItem._id, 0].join(":");
  const ownerSlot = unit => [orderId, itemId, unit].join(":");
  const otherSlot = [new mongoose.Types.ObjectId(), itemId, 0].join(":");
  let orderFilter;
  let deliveryFilter;
  const records = [];
  const delivery = load("./lib/game-account-delivery.ts", {
    "server-only": {},
    "node:crypto": crypto,
    mongoose: {
      isValidObjectId: mongoose.isValidObjectId,
      connection: { db: { collection: () => ({
        find(filter) {
          deliveryFilter = filter;
          return { toArray: async () => records.filter(record => filter._id.$in.includes(record._id)) };
        },
      }) } },
    },
    "@/lib/mongodb": async () => {},
    "@/model/Order": {
      find(filter) {
        orderFilter = filter;
        return { select: () => ({ sort: () => ({
          lean: async () => filter.user === String(owner) ? [{ _id: orderId, items: [item, legacyItem] }] : [],
        }) }) };
      },
    },
    "@/model/Product": {
      find: () => ({ select: () => ({ lean: async () => [{
        _id: item.product,
        specifications: [{ title: "اطلاعات بازی", items: [
          { key: "آموزش نصب", value: "راهنمای ثبت‌شده برای این محصول" },
          { key: "ناشر", value: "Publisher" },
        ] }],
      }, { _id: legacyItem.product, title: "Legacy game", mainImage: "/legacy.webp" }] }) }),
    },
  });
  records.push(
    { _id: ownerSlot(0), encrypted: delivery.seal(ownerSlot(0), "owner@example.test", "private-owner") },
    { _id: ownerSlot(2), encrypted: "invalid ciphertext" },
    { _id: otherSlot, encrypted: delivery.seal(otherSlot, "other@example.test", "private-other") },
  );

  let session = null;
  const route = () => load("./app/api/profile/game-accounts/route.ts", {
    "next-auth": { getServerSession: async () => session },
    "next/server": { NextResponse: { json: (data, init) => Response.json(data, init) } },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/game-account-delivery": delivery,
  });
  const { GET } = route();
  const request = new Request(`https://example.test/api/profile/game-accounts?user=${otherOwner}`);

  const guest = await GET(request);
  assert.equal(guest.status, 401);
  assert.equal(orderFilter, undefined);

  session = { user: { id: String(owner) } };
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/);
  assert.equal(response.headers.get("Vary"), "Cookie");
  const accounts = await response.json();
  assert.equal(orderFilter.user, String(owner));
  assert.equal(orderFilter.paymentStatus, "paid");
  assert.equal(orderFilter.status.$ne, "cancelled");
  assert.equal(deliveryFilter._id.$in.join(), [ownerSlot(0), ownerSlot(1), ownerSlot(2), legacySlot].join());
  assert.deepEqual(accounts.map(account => account.status), ["ready", "pending", "unavailable", "pending"]);
  assert.deepEqual(accounts[0].credentials, { email: "owner@example.test", password: "private-owner" });
  assert.equal(accounts[0].platform, "PS5");
  assert.equal(accounts[0].capacity, "۲");
  assert.deepEqual(accounts[0].guide, [{ key: "آموزش نصب", value: "راهنمای ثبت‌شده برای این محصول" }]);
  assert.equal(accounts[0].orderNumber, String(orderId).slice(-8).toUpperCase());
  assert.equal(accounts[3].title, "Legacy game");
  assert.equal(accounts[3].image, "/legacy.webp");
  assert.equal(accounts[3].platform, null);
  assert.ok(accounts.slice(1).every(account => !("credentials" in account)));
  assert.doesNotMatch(JSON.stringify(accounts), /private-other|invalid ciphertext/);

  session = { user: { id: String(otherOwner) } };
  assert.deepEqual(await (await GET(request)).json(), []);
});
