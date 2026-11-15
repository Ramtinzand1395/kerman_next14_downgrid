import { randomUUID } from "node:crypto";
import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { type AnalyticsSession } from "./ecommerce";
import { purchasePayload, type PurchaseOrder } from "./purchase";

const POLL_MS = 15_000;
const LEASE_MS = 60_000;
const MAX_EVENT_AGE_MS = 71 * 60 * 60 * 1000;
const BATCH_SIZE = 10;
const REMOVE_PENDING_FIELDS = {
  "purchaseAnalytics.session": "",
  "purchaseAnalytics.nextAttemptAt": "",
  "purchaseAnalytics.claimToken": "",
};

let started = false;

export function startPurchaseAnalyticsWorker() {
  if (started) return;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId) || !apiSecret) return;

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", apiSecret);
  const debugMode = process.env.GA4_DEBUG_MODE === "true";
  started = true;

  async function poll() {
    try {
      await dbConnect();
      const cutoff = new Date(Date.now() - MAX_EVENT_AGE_MS);
      await Order.updateMany({
        "purchaseAnalytics.nextAttemptAt": { $type: "date", $lte: new Date() },
        paymentVerifiedAt: { $lt: cutoff },
      }, {
        $set: { "purchaseAnalytics.failedAt": new Date() },
        $unset: REMOVE_PENDING_FIELDS,
      }, { timestamps: false });

      for (let index = 0; index < BATCH_SIZE; index++) {
        if (!await sendNextPurchase(endpoint, cutoff, debugMode)) break;
      }
    } catch {
      // Keep the poller alive through temporary database errors.
      console.error("[ga4.purchase] worker poll failed");
    } finally {
      setTimeout(poll, POLL_MS).unref();
    }
  }

  setTimeout(poll, POLL_MS).unref();
}

export async function sendNextPurchase(endpoint: URL, cutoff: Date, debugMode: boolean) {
  const claimToken = randomUUID();
  const now = new Date();
  const order = await Order.findOneAndUpdate({
    paymentStatus: "paid",
    paymentVerifiedAt: { $gte: cutoff },
    "purchaseAnalytics.nextAttemptAt": { $type: "date", $lte: now },
  }, {
    $set: {
      "purchaseAnalytics.claimToken": claimToken,
      "purchaseAnalytics.nextAttemptAt": new Date(now.getTime() + LEASE_MS),
    },
    $inc: { "purchaseAnalytics.attempts": 1 },
  }, {
    sort: { "purchaseAnalytics.nextAttemptAt": 1 },
    returnDocument: "after",
    timestamps: false,
  }).select("_id items finalPrice shippingCost paymentVerifiedAt +purchaseAnalytics")
    .lean<PurchaseOrder & { purchaseAnalytics: { session: AnalyticsSession; attempts: number } }>();
  if (!order) return false;

  const claim = { _id: order._id, "purchaseAnalytics.claimToken": claimToken };
  let status: number | undefined;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchasePayload(order, order.purchaseAnalytics.session, debugMode)),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    status = response.status;
  } catch {
    // A timeout may follow delivery. The next attempt uses the same transaction ID.
  }

  const sent = status !== undefined && status >= 200 && status < 300;
  const permanentFailure = status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
  if (sent || permanentFailure) {
    await Order.updateOne(claim, {
      $set: { [sent ? "purchaseAnalytics.sentAt" : "purchaseAnalytics.failedAt"]: new Date() },
      $unset: REMOVE_PENDING_FIELDS,
    }, { timestamps: false });
    if (permanentFailure) console.error("[ga4.purchase] request rejected", { status });
  } else {
    const delay = Math.min(60 * 60_000, LEASE_MS * 2 ** Math.min(order.purchaseAnalytics.attempts - 1, 6));
    await Order.updateOne(claim, {
      $set: { "purchaseAnalytics.nextAttemptAt": new Date(Date.now() + delay) },
      $unset: { "purchaseAnalytics.claimToken": "" },
    }, { timestamps: false });
  }
  return true;
}
