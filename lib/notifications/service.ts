import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import NotificationReceipt from "@/model/NotificationReceipt";
import { normalizePage, normalizePageSize } from "./policy";
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationSenderType,
  NotificationType,
} from "./constants";

export type NotificationRecipientRole = "USER" | "ADMIN" | (string & {});

export interface CreateNotificationInput {
  recipientId?: string | mongoose.Types.ObjectId | null;
  recipientRole: NotificationRecipientRole;
  type: NotificationType | (string & {});
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
  senderType?: NotificationSenderType;
  senderId?: string | mongoose.Types.ObjectId | null;
  eventKey?: string;
}

export interface NotificationListOptions {
  page?: number;
  limit?: number;
  read?: boolean;
  category?: string;
  priority?: string;
  handled?: boolean;
  from?: Date;
  to?: Date;
  search?: string;
}

function objectId(value?: string | mongoose.Types.ObjectId | null) {
  if (!value) return null;
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

export function recipientQuery(recipientId: string, recipientRole: NotificationRecipientRole) {
  const id = objectId(recipientId);
  const canonical = {
    recipientRole,
    $or: [{ recipientId: id }, { recipientId: null }, { recipientId: { $exists: false } }],
  };
  const legacy = recipientRole === "USER"
    ? { for: "user", user: id, recipientRole: { $exists: false } }
    : { for: "admin", recipientRole: { $exists: false } };
  return { $or: [canonical, legacy] };
}

function ownershipQuery(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  return { _id: objectId(notificationId), ...recipientQuery(recipientId, recipientRole) };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function personalStatePipeline(
  recipientId: string,
  recipientRole: NotificationRecipientRole,
  options: NotificationListOptions = {},
  applyFilters = true,
) {
  const actorId = objectId(recipientId);
  const pipeline: Record<string, unknown>[] = [
    { $match: recipientQuery(recipientId, recipientRole) },
    {
      $lookup: {
        from: NotificationReceipt.collection.name,
        let: { notificationId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$notificationId", "$$notificationId"] },
                  { $eq: ["$recipientId", actorId] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "_receipts",
      },
    },
    { $set: { _receipt: { $first: "$_receipts" } } },
    {
      $set: {
        isRead: {
          $cond: [
            { $ne: [{ $ifNull: ["$_receipt.readAt", null] }, null] },
            true,
            {
              $cond: [
                {
                  $and: [
                    { $eq: [recipientRole, "ADMIN"] },
                    {
                      $or: [
                        { $eq: [{ $ifNull: ["$recipientId", null] }, null] },
                        { $eq: ["$for", "admin"] },
                      ],
                    },
                  ],
                },
                false,
                { $ifNull: ["$isRead", false] },
              ],
            },
          ],
        },
        readAt: { $ifNull: ["$_receipt.readAt", "$readAt"] },
        archivedAt: { $ifNull: ["$_receipt.archivedAt", null] },
        handlingStatus: { $ifNull: ["$handlingStatus", "pending"] },
      },
    },
    { $match: { archivedAt: null } },
  ];

  if (recipientRole === "ADMIN") {
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "handledBy",
          foreignField: "_id",
          pipeline: [{ $project: { username: 1, mobile: 1 } }],
          as: "_handledBy",
        },
      },
      { $set: { handledBy: { $ifNull: [{ $first: "$_handledBy" }, "$handledBy"] } } },
      { $unset: "_handledBy" },
    );
  }

  const filters = buildOptionFilters(options);
  if (applyFilters && Object.keys(filters).length) pipeline.push({ $match: filters });
  return pipeline;
}

function buildOptionFilters(options: NotificationListOptions) {
  const filters: Record<string, unknown> = {};
  if (typeof options.read === "boolean") filters.isRead = options.read;
  if (options.category) filters.category = options.category;
  if (options.priority) filters.priority = options.priority;
  if (typeof options.handled === "boolean") {
    filters.handlingStatus = options.handled ? "handled" : "pending";
  }
  if (options.from || options.to) {
    filters.createdAt = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }
  if (options.search?.trim()) {
    const search = new RegExp(escapeRegExp(options.search.trim().slice(0, 100)), "i");
    filters.$or = [{ title: search }, { message: search }];
  }
  return filters;
}

export async function createNotification(input: CreateNotificationInput) {
  await dbConnect();
  const recipientId = objectId(input.recipientId);
  if (input.recipientRole === "USER" && !recipientId) {
    throw new Error("USER_NOTIFICATION_REQUIRES_RECIPIENT");
  }
  const senderId = objectId(input.senderId);
  const entityId = objectId(input.entityId);
  const deduplicationKey = input.eventKey
    ? `${input.recipientRole}:${recipientId?.toString() ?? "*"}:${input.eventKey}`
    : undefined;
  const data = {
    recipientId,
    recipientRole: input.recipientRole,
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    message: input.message.trim(),
    link: input.link?.trim() || null,
    entityType: input.entityType || null,
    entityId,
    metadata: input.metadata || {},
    priority: input.priority || "normal",
    senderType: input.senderType || "system",
    senderId,
    eventKey: input.eventKey,
    deduplicationKey,
    isRead: false,
    readAt: null,
    handlingStatus: "pending",
  };

  if (!deduplicationKey) return Notification.create(data);
  return Notification.findOneAndUpdate(
    { deduplicationKey },
    { $setOnInsert: data },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

export function notifyUser(input: Omit<CreateNotificationInput, "recipientRole" | "recipientId"> & { userId: string | mongoose.Types.ObjectId }) {
  return createNotification({ ...input, recipientRole: "USER", recipientId: input.userId });
}

export function notifyAdmin(input: Omit<CreateNotificationInput, "recipientRole" | "recipientId"> & { adminId: string | mongoose.Types.ObjectId }) {
  return createNotification({ ...input, recipientRole: "ADMIN", recipientId: input.adminId });
}

export async function notifyAdmins(input: Omit<CreateNotificationInput, "recipientRole" | "recipientId">) {
  // اعلان مدیریتی یک رویداد مشترک است و فقط یک بار ذخیره می‌شود.
  // همه مدیران آن را از طریق recipientRole می‌بینند.
  return createNotification({ ...input, recipientRole: "ADMIN", recipientId: null });
}

export const notify = {
  create: createNotification,
  user: notifyUser,
  admin: notifyAdmin,
  allAdmins: notifyAdmins,
};

export async function getNotifications(recipientId: string, recipientRole: NotificationRecipientRole, options: NotificationListOptions = {}) {
  await dbConnect();
  const page = normalizePage(options.page);
  const limit = normalizePageSize(options.limit);
  const pipeline = personalStatePipeline(recipientId, recipientRole, {}, false);
  const filters = buildOptionFilters(options);
  const filteredStages = Object.keys(filters).length ? [{ $match: filters }] : [];
  pipeline.push({
    $facet: {
      items: [
        ...filteredStages,
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $unset: ["_receipt", "_receipts"] },
      ],
      total: [...filteredStages, { $count: "value" }],
      unread: [{ $match: { isRead: false } }, { $count: "value" }],
    },
  });
  const [result] = await Notification.aggregate(pipeline as unknown as mongoose.PipelineStage[]);
  const total = result?.total?.[0]?.value || 0;
  return {
    notifications: (result?.items || []).map((item: Record<string, unknown>) =>
      item.link === "/dashboard/inbox"
        ? { ...item, link: "/dashboard/notifications" }
        : item,
    ),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    unreadCount: result?.unread?.[0]?.value || 0,
  };
}

export async function getUnreadCount(recipientId: string, recipientRole: NotificationRecipientRole) {
  const result = await getNotifications(recipientId, recipientRole, { page: 1, limit: 1, read: false });
  return result.pagination.total;
}

export async function markAsRead(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  const notification = await getOwnedNotification(notificationId, recipientId, recipientRole);
  if (!notification) return null;
  const receipt = await NotificationReceipt.findOneAndUpdate(
    { notificationId: notification._id, recipientId: objectId(recipientId) },
    { $set: { readAt: new Date() }, $setOnInsert: { archivedAt: null } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return { ...notification.toObject(), isRead: true, readAt: receipt.readAt };
}

export async function markAllAsRead(recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  const ids = await Notification.aggregate([
    ...personalStatePipeline(recipientId, recipientRole, { read: false }),
    { $project: { _id: 1 } },
  ] as unknown as mongoose.PipelineStage[]);
  const now = new Date();
  let modifiedCount = 0;
  for (let index = 0; index < ids.length; index += 500) {
    const chunk = ids.slice(index, index + 500);
    const result = await NotificationReceipt.bulkWrite(
      chunk.map(({ _id }) => ({
        updateOne: {
          filter: { notificationId: _id, recipientId: objectId(recipientId) },
          update: { $set: { readAt: now }, $setOnInsert: { archivedAt: null } },
          upsert: true,
        },
      })),
    );
    modifiedCount += result.modifiedCount + result.upsertedCount;
  }
  return { modifiedCount };
}

export async function getOwnedNotification(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  return Notification.findOne(ownershipQuery(notificationId, recipientId, recipientRole));
}

export async function archiveNotification(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  const notification = await getOwnedNotification(notificationId, recipientId, recipientRole);
  if (!notification) return null;
  const receipt = await NotificationReceipt.findOneAndUpdate(
    { notificationId: notification._id, recipientId: objectId(recipientId) },
    { $set: { archivedAt: new Date() } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return { ...notification.toObject(), archivedAt: receipt.archivedAt };
}

export const deleteNotification = archiveNotification;

export async function setNotificationHandled(notificationId: string, recipientId: string, handled: boolean) {
  const notification = await getOwnedNotification(notificationId, recipientId, "ADMIN");
  if (!notification) return null;
  return Notification.findByIdAndUpdate(
    notification._id,
    {
      $set: {
        handlingStatus: handled ? "handled" : "pending",
        handledAt: handled ? new Date() : null,
        handledBy: handled ? objectId(recipientId) : null,
      },
    },
    { returnDocument: "after" },
  ).populate("handledBy", "username mobile");
}
