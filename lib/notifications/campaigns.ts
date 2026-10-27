import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import NotificationCampaign from "@/model/NotificationCampaign";
import NotificationDelivery from "@/model/NotificationDelivery";
import NotificationReceipt from "@/model/NotificationReceipt";
import Order from "@/model/Order";
import Product from "@/model/Product";
import User from "@/model/User";
import { canCancelCampaign } from "./policy";

type Audience =
  | { kind: "selected"; userIds: string[] }
  | { kind: "all_users" }
  | { kind: "product_buyers"; productId: string }
  | { kind: "category_buyers"; categoryId: string }
  | { kind: "active_orders" };

const ACTIVE_ORDER_STATUSES = ["pending", "processing", "shipped"];

function oid(value: string | mongoose.Types.ObjectId) {
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

async function audienceCursor(audience: Audience) {
  if (audience.kind === "selected") {
    return User.find({ _id: { $in: audience.userIds.map(oid) }, role: "user" })
      .select("_id")
      .lean()
      .cursor();
  }
  if (audience.kind === "all_users") {
    return User.find({ role: "user" }).select("_id").sort({ _id: 1 }).lean().cursor();
  }
  let orderMatch: Record<string, unknown>;
  if (audience.kind === "active_orders") {
    orderMatch = { user: { $ne: null }, status: { $in: ACTIVE_ORDER_STATUSES } };
  } else if (audience.kind === "product_buyers") {
    orderMatch = { user: { $ne: null }, "items.product": oid(audience.productId) };
  } else {
    const productIds = await Product.distinct("_id", { category: oid(audience.categoryId) });
    orderMatch = { user: { $ne: null }, "items.product": { $in: productIds } };
  }
  return Order.aggregate([
    { $match: orderMatch },
    { $group: { _id: "$user" } },
    { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "user" } },
    { $match: { "user.role": "user" } },
    { $project: { _id: 1 } },
    { $sort: { _id: 1 } },
  ]).cursor();
}

export async function previewAudience(audience: Audience) {
  await dbConnect();
  const cursor = await audienceCursor(audience);
  let count = 0;
  const sampleIds: mongoose.Types.ObjectId[] = [];
  for await (const row of cursor) {
    count += 1;
    if (sampleIds.length < 5) sampleIds.push(row._id);
  }
  const sample = await User.find({ _id: { $in: sampleIds } })
    .select("username mobile email")
    .lean();
  return { count, sample };
}

async function materializeRecipients(campaign: any) {
  if (campaign.recipientsMaterializedAt) return campaign.recipientCount;
  const audience = campaign.audience.toObject() as Audience;
  const cursor = await audienceCursor(audience);
  let operations: Array<Record<string, unknown>> = [];
  const flush = async () => {
    if (!operations.length) return;
    try {
      await NotificationDelivery.bulkWrite(operations as any[], { ordered: false });
    } catch (error) {
      const writeErrors = (error as { writeErrors?: Array<{ code?: number }> }).writeErrors;
      if (!writeErrors?.length || writeErrors.some((item) => item.code !== 11000)) throw error;
    }
    operations = [];
  };
  for await (const row of cursor) {
    operations.push({
      updateOne: {
        filter: { campaignId: campaign._id, recipientId: row._id },
        update: {
          $setOnInsert: {
            campaignId: campaign._id,
            recipientId: row._id,
            status: "pending",
            attempts: 0,
            nextAttemptAt: campaign.scheduledAt || new Date(),
          },
        },
        upsert: true,
      },
    });
    if (operations.length >= 500) {
      await flush();
    }
  }
  await flush();
  const total = await NotificationDelivery.countDocuments({ campaignId: campaign._id });
  await NotificationCampaign.updateOne(
    { _id: campaign._id, recipientsMaterializedAt: null },
    { $set: { recipientCount: total, recipientsMaterializedAt: new Date() } },
  );
  return total;
}

export async function createCampaign(input: {
  createdBy: string;
  idempotencyKey: string;
  title: string;
  message: string;
  link?: string;
  priority: string;
  audience: Audience;
  mode: "draft" | "send";
  scheduledAt?: string;
}) {
  await dbConnect();
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  let campaign = await NotificationCampaign.findOne({
    createdBy: oid(input.createdBy),
    idempotencyKey: input.idempotencyKey,
  });
  if (!campaign) {
    const recentCount = await NotificationCampaign.countDocuments({
      createdBy: oid(input.createdBy),
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentCount >= 20) throw new Error("CAMPAIGN_RATE_LIMIT");
  }
  if (!campaign) {
    try {
      campaign = await NotificationCampaign.findOneAndUpdate(
        { createdBy: oid(input.createdBy), idempotencyKey: input.idempotencyKey },
        {
          $setOnInsert: {
            createdBy: oid(input.createdBy),
            idempotencyKey: input.idempotencyKey,
            title: input.title,
            message: input.message,
            link: input.link || null,
            priority: input.priority,
            audience: input.audience,
            requestedMode: input.mode,
            scheduledAt,
            status: "draft",
            recipientCount: 0,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
      campaign = await NotificationCampaign.findOne({
        createdBy: oid(input.createdBy),
        idempotencyKey: input.idempotencyKey,
      });
    }
  }
  if (!campaign) throw new Error("CAMPAIGN_CREATE_FAILED");
  await materializeRecipients(campaign);
  if (campaign.requestedMode === "send" && campaign.status === "draft") {
    const isFuture = campaign.scheduledAt && campaign.scheduledAt.getTime() > Date.now();
    await NotificationCampaign.updateOne(
      { _id: campaign._id, status: "draft" },
      { $set: { status: isFuture ? "scheduled" : "queued" } },
    );
  }
  return NotificationCampaign.findById(campaign._id).lean();
}

export async function campaignStats(campaignIds: mongoose.Types.ObjectId[]) {
  if (!campaignIds.length) return new Map<string, Record<string, number>>();
  const rows = await NotificationDelivery.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $lookup: {
        from: NotificationReceipt.collection.name,
        localField: "notificationId",
        foreignField: "notificationId",
        as: "receipts",
      },
    },
    {
      $group: {
        _id: "$campaignId",
        pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "processing"]] }, 1, 0] } },
        succeeded: { $sum: { $cond: [{ $eq: ["$status", "succeeded"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        read: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $filter: { input: "$receipts", as: "r", cond: { $ne: ["$$r.readAt", null] } } } }, 0] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

export async function listCampaigns(page = 1, limit = 10) {
  await dbConnect();
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(25, Math.max(1, Math.floor(limit)));
  const [campaigns, total] = await Promise.all([
    NotificationCampaign.find()
      .populate("createdBy", "username mobile")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    NotificationCampaign.countDocuments(),
  ]);
  const stats = await campaignStats(campaigns.map((item) => item._id));
  return {
    campaigns: campaigns.map((item) => ({ ...item, stats: stats.get(String(item._id)) || {} })),
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.max(1, Math.ceil(total / safeLimit)) },
  };
}

export async function getCampaign(campaignId: string, page = 1, limit = 50) {
  await dbConnect();
  const campaign = await NotificationCampaign.findById(campaignId)
    .populate("createdBy", "username mobile")
    .lean();
  if (!campaign) return null;
  const stats = await campaignStats([campaign._id]);
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const [deliveries, deliveryTotal] = await Promise.all([
    NotificationDelivery.find({ campaignId: campaign._id })
      .populate("recipientId", "username mobile email")
      .sort({ createdAt: 1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    NotificationDelivery.countDocuments({ campaignId: campaign._id }),
  ]);
  const receiptRows = await NotificationReceipt.find({
    notificationId: { $in: deliveries.map((delivery) => delivery.notificationId).filter(Boolean) },
    readAt: { $ne: null },
  }).select("notificationId readAt").lean();
  const readByNotification = new Map(receiptRows.map((receipt) => [String(receipt.notificationId), receipt.readAt]));
  return {
    ...campaign,
    stats: stats.get(String(campaign._id)) || {},
    deliveries: deliveries.map((delivery) => ({
      ...delivery,
      readAt: delivery.notificationId ? readByNotification.get(String(delivery.notificationId)) || null : null,
    })),
    deliveryPagination: {
      page: safePage,
      limit: safeLimit,
      total: deliveryTotal,
      pages: Math.max(1, Math.ceil(deliveryTotal / safeLimit)),
    },
  };
}

export async function retryFailedDeliveries(campaignId: string) {
  await dbConnect();
  const campaign = await NotificationCampaign.findOneAndUpdate(
    { _id: campaignId, status: { $ne: "cancelled" }, manualRetryCount: { $lt: 3 } },
    { $inc: { manualRetryCount: 1 } },
    { returnDocument: "after" },
  );
  if (!campaign || campaign.status === "cancelled") return null;
  const result = await NotificationDelivery.updateMany(
    { campaignId: campaign._id, status: "failed" },
    {
      $set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: null,
      },
    },
  );
  if (result.modifiedCount) {
    await NotificationCampaign.updateOne(
      { _id: campaign._id },
      { $set: { status: "queued", completedAt: null } },
    );
  }
  return { retriedCount: result.modifiedCount };
}

export async function launchDraft(campaignId: string) {
  await dbConnect();
  return NotificationCampaign.findOneAndUpdate(
    { _id: campaignId, status: "draft", recipientsMaterializedAt: { $ne: null } },
    { $set: { status: "queued", scheduledAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function cancelCampaign(campaignId: string) {
  await dbConnect();
  const campaign = await NotificationCampaign.findById(campaignId);
  if (!campaign || !canCancelCampaign(campaign.status)) return null;
  const updated = await NotificationCampaign.findOneAndUpdate(
    { _id: campaign._id, status: { $in: ["draft", "scheduled", "queued"] }, startedAt: null },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) return null;
  await NotificationDelivery.updateMany(
    { campaignId: campaign._id, status: "pending" },
    { $set: { status: "cancelled" } },
  );
  return updated;
}
