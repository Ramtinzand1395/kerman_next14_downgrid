import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import User from "@/model/User";
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
}

const FAN_OUT_BATCH_SIZE = 50;

function objectId(value?: string | mongoose.Types.ObjectId | null) {
  if (!value) return null;
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

function recipientQuery(recipientId: string, recipientRole: NotificationRecipientRole) {
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

export async function notifyAllUsers(input: Omit<CreateNotificationInput, "recipientRole" | "recipientId">) {
  await dbConnect();
  const cursor = User.find({ role: "user" }).select("_id").lean().cursor();
  let sentCount = 0;
  let batch: Array<Promise<unknown>> = [];
  for await (const user of cursor) {
    batch.push(notifyUser({ ...input, userId: user._id }));
    if (batch.length >= FAN_OUT_BATCH_SIZE) {
      await Promise.all(batch);
      sentCount += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await Promise.all(batch);
    sentCount += batch.length;
  }
  return sentCount;
}

export const notify = {
  create: createNotification,
  user: notifyUser,
  admin: notifyAdmin,
  allAdmins: notifyAdmins,
  allUsers: notifyAllUsers,
};

export async function getNotifications(recipientId: string, recipientRole: NotificationRecipientRole, options: NotificationListOptions = {}) {
  await dbConnect();
  const requestedPage = Number(options.page);
  const requestedLimit = Number(options.limit);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 10;
  const filter: Record<string, unknown> = recipientQuery(recipientId, recipientRole);
  if (typeof options.read === "boolean") filter.isRead = options.read;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);
  return {
    notifications: items.map((item) =>
      item.link === "/dashboard/inbox"
        ? { ...item, link: "/dashboard/notifications" }
        : item,
    ),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    unreadCount,
  };
}

export async function getUnreadCount(recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  return Notification.countDocuments({ ...recipientQuery(recipientId, recipientRole), isRead: false });
}

export async function markAsRead(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  return Notification.findOneAndUpdate(
    ownershipQuery(notificationId, recipientId, recipientRole),
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function markAllAsRead(recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  return Notification.updateMany(
    { ...recipientQuery(recipientId, recipientRole), isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
}

export async function deleteNotification(notificationId: string, recipientId: string, recipientRole: NotificationRecipientRole) {
  await dbConnect();
  return Notification.findOneAndDelete(ownershipQuery(notificationId, recipientId, recipientRole));
}
