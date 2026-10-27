import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const MAX_ATTEMPTS = Math.max(1, Number(process.env.NOTIFICATION_MAX_ATTEMPTS || 5));
const LEASE_MS = Math.max(30_000, Number(process.env.NOTIFICATION_LEASE_MS || 120_000));
const POLL_MS = Math.max(500, Number(process.env.NOTIFICATION_POLL_MS || 2_000));
const BATCH_SIZE = Math.min(100, Math.max(1, Number(process.env.NOTIFICATION_BATCH_SIZE || 25)));

const Campaign = mongoose.models.NotificationCampaign || mongoose.model(
  "NotificationCampaign",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
);
const Delivery = mongoose.models.NotificationDelivery || mongoose.model(
  "NotificationDelivery",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
);
const Notification = mongoose.models.Notification || mongoose.model(
  "Notification",
  new mongoose.Schema({}, { strict: false, timestamps: true }),
);

let stopping = false;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const backoff = (attempt) => Math.min(3_600_000, 30_000 * 2 ** Math.max(0, attempt - 1));

async function activateScheduled() {
  const now = new Date();
  await Campaign.updateMany(
    { status: "scheduled", scheduledAt: { $lte: now }, startedAt: null },
    { $set: { status: "queued" } },
  );
}

async function claimDelivery(campaignId) {
  const now = new Date();
  const leaseToken = randomUUID();
  return Delivery.findOneAndUpdate(
    {
      campaignId,
      $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "processing", leaseExpiresAt: { $lte: now } },
        { status: "failed", attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1, _id: 1 }, returnDocument: "after" },
  );
}

async function deliver(campaign, delivery) {
  try {
    const deduplicationKey = `USER:${delivery.recipientId}:CAMPAIGN:${campaign._id}:${delivery.recipientId}`;
    const notification = await Notification.findOneAndUpdate(
      { deduplicationKey },
      {
        $setOnInsert: {
          recipientId: delivery.recipientId,
          recipientRole: "USER",
          type: "ADMIN_MESSAGE",
          category: "system",
          title: campaign.title,
          message: campaign.message,
          link: campaign.link || null,
          priority: campaign.priority || "normal",
          senderType: "admin",
          senderId: campaign.createdBy,
          eventKey: `CAMPAIGN:${campaign._id}:${delivery.recipientId}`,
          deduplicationKey,
          metadata: { campaignId: campaign._id },
          isRead: false,
          readAt: null,
          handlingStatus: "pending",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    await Delivery.updateOne(
      { _id: delivery._id, leaseToken: delivery.leaseToken, status: "processing" },
      {
        $set: {
          status: "succeeded",
          notificationId: notification._id,
          succeededAt: new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: null,
        },
      },
    );
  } catch (error) {
    await Delivery.updateOne(
      { _id: delivery._id, leaseToken: delivery.leaseToken, status: "processing" },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          nextAttemptAt: new Date(Date.now() + backoff(delivery.attempts)),
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: String(error instanceof Error ? error.message : error).slice(0, 1000),
        },
      },
    );
  }
}

async function reconcile(campaignId) {
  const now = new Date();
  const remaining = await Delivery.exists({
    campaignId,
    $or: [
      { status: { $in: ["pending", "processing"] } },
      { status: "failed", attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $gte: new Date(0) } },
    ],
  });
  if (!remaining) {
    await Campaign.updateOne(
      { _id: campaignId, status: "processing" },
      { $set: { status: "completed", completedAt: now } },
    );
  }
}

async function tick() {
  await activateScheduled();
  const campaigns = await Campaign.find(
    { status: { $in: ["queued", "processing"] }, recipientsMaterializedAt: { $ne: null } },
  ).sort({ scheduledAt: 1, createdAt: 1 }).limit(50);
  for (const campaign of campaigns) {
    const startedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaign._id, status: { $in: ["queued", "processing"] } },
      [{ $set: { status: "processing", startedAt: { $ifNull: ["$startedAt", "$$NOW"] } } }],
      { returnDocument: "after", updatePipeline: true },
    );
    if (!startedCampaign) continue;
    const firstDelivery = await claimDelivery(startedCampaign._id);
    if (!firstDelivery) {
      await reconcile(startedCampaign._id);
      continue;
    }
    await deliver(startedCampaign, firstDelivery);
    let processed = 1;
    while (!stopping && processed < BATCH_SIZE) {
      const delivery = await claimDelivery(startedCampaign._id);
      if (!delivery) break;
      await deliver(startedCampaign, delivery);
      processed += 1;
    }
    await reconcile(startedCampaign._id);
    return true;
  }
  return false;
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  process.stdout.write("notification worker connected\n");
  while (!stopping) {
    const worked = await tick().catch((error) => {
      process.stderr.write(`notification worker tick failed: ${String(error)}\n`);
      return false;
    });
    if (!worked) await wait(POLL_MS);
  }
  await mongoose.disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { stopping = true; });
}

await main();
