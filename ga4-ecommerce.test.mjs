import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import "./scripts/pos-test-loader.mjs";

const { parseAnalyticsSession } = await import("./lib/analytics/ecommerce.ts");
const { purchasePayload } = await import("./lib/analytics/purchase.ts");
const { sendNextPurchase } = await import("./lib/analytics/purchase-worker.ts");
const { default: Order } = await import("./model/Order.ts");

const _id = new mongoose.Types.ObjectId();
const session = { clientId: "12345.67890", sessionId: 1234567890 };
const order = {
  _id,
  finalPrice: 140,
  shippingCost: 20,
  paymentVerifiedAt: new Date(),
  items: [{
    product: new mongoose.Types.ObjectId(),
    productTitle: "شاسی",
    variantTitle: "A5",
    price: 100,
    discountPrice: 75,
    quantity: 2,
    total: 150,
  }],
};

test("purchase uses the confirmed order, net item prices in rial, and the browser session", () => {
  assert.deepEqual(parseAnalyticsSession({ clientId: session.clientId, sessionId: String(session.sessionId) }), session);
  assert.equal(parseAnalyticsSession({ clientId: "name@example.com", sessionId: "123" }), undefined);
  const body = purchasePayload(order, session, true);
  assert.equal(body.client_id, session.clientId);
  assert.equal(body.timestamp_micros, order.paymentVerifiedAt.getTime() * 1000);
  assert.deepEqual(body.events, [{
    name: "purchase",
    params: {
      currency: "IRR", value: 1200, shipping: 200, transaction_id: _id.toString(),
      items: [{ item_id: order.items[0].product.toString(), item_name: "شاسی", item_variant: "A5", price: 600, quantity: 2 }],
      value_toman: 120, shipping_toman: 20,
      session_id: session.sessionId, engagement_time_msec: 1, debug_mode: 1,
    },
  }]);
});

test("the purchase queue retries with one transaction ID and claims orders atomically", {
  skip: process.env.GA4_LOCAL_MONGO_TESTS !== "true",
  timeout: 30000,
}, async (t) => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: { ip: "127.0.0.1", args: ["--nounixsocket"] },
  });
  t.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
  await mongoose.connect(mongo.getUri());
  const pending = { session, nextAttemptAt: new Date(0), attempts: 0 };
  await Order.collection.insertMany([
    { ...order, paymentStatus: "paid", purchaseAnalytics: pending },
    { ...order, _id: new mongoose.Types.ObjectId(), paymentStatus: "unpaid", purchaseAnalytics: pending },
  ]);

  const sent = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response(null, { status: sent.length === 1 ? 503 : 204 });
  });

  const endpoint = new URL("https://example.invalid/mp/collect");
  const cutoff = new Date(0);
  const drain = () => sendNextPurchase(endpoint, cutoff, false);
  assert.deepEqual((await Promise.all([drain(), drain()])).sort(), [false, true]);
  assert.equal(sent.length, 1);
  assert.equal(await drain(), false);
  const failedAttempt = await Order.collection.findOne({ _id });
  assert.equal(failedAttempt.purchaseAnalytics.attempts, 1);
  assert.ok(failedAttempt.purchaseAnalytics.nextAttemptAt > new Date());

  await Order.collection.updateOne({ _id }, {
    $set: { "purchaseAnalytics.nextAttemptAt": new Date(0) },
  });
  assert.equal(await drain(), true);
  assert.equal(await drain(), false);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], sent[1]);
  const stored = await Order.collection.findOne({ _id });
  assert.ok(stored.purchaseAnalytics.sentAt instanceof Date);
  assert.equal(stored.purchaseAnalytics.session, undefined);
  assert.equal(stored.purchaseAnalytics.nextAttemptAt, undefined);
  assert.equal((await Order.findById(_id).lean()).purchaseAnalytics, undefined);
});

test("purchase converts toman to a supported GA4 currency only with an explicit rate", () => {
  const previousCurrency = process.env.GA4_REPORTING_CURRENCY;
  const previousRate = process.env.GA4_TOMAN_PER_REPORTING_UNIT;
  try {
    process.env.GA4_REPORTING_CURRENCY = "USD";
    process.env.GA4_TOMAN_PER_REPORTING_UNIT = "100";
    const params = purchasePayload(order, session, false).events[0].params;
    assert.equal(params.currency, "USD");
    assert.equal(params.value, 1.2);
    assert.equal(params.shipping, 0.2);
    assert.equal(params.items[0].price, 0.6);
    assert.equal(params.value_toman, 120);
    process.env.GA4_TOMAN_PER_REPORTING_UNIT = "not-a-rate";
    assert.equal(purchasePayload(order, session, false).events[0].params.currency, "IRR");
  } finally {
    if (previousCurrency === undefined) delete process.env.GA4_REPORTING_CURRENCY;
    else process.env.GA4_REPORTING_CURRENCY = previousCurrency;
    if (previousRate === undefined) delete process.env.GA4_TOMAN_PER_REPORTING_UNIT;
    else process.env.GA4_TOMAN_PER_REPORTING_UNIT = previousRate;
  }
});
