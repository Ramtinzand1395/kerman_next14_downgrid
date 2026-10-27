import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import ContactMessage from "@/model/ContactMessage";
import Order from "@/model/Order";
import SupportConversation from "@/model/SupportConversation";
import SupportMessage from "@/model/SupportMessage";
import { notifyAdmins, notifyUser } from "./service";

export type ConversationActor = {
  id: string;
  role: string;
};

function oid(value: string | mongoose.Types.ObjectId) {
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

function isSupportAdmin(role: string) {
  return role === "superadmin";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function upsertLegacyConversation(contactMessageId: string | mongoose.Types.ObjectId) {
  await dbConnect();
  const contact = await ContactMessage.findById(contactMessageId).lean();
  if (!contact) return null;
  let conversation;
  try {
    conversation = await SupportConversation.findOneAndUpdate(
      { legacyContactMessageId: contact._id },
      {
        $setOnInsert: {
          customerId: contact.user,
          subject: contact.subject,
          contactSnapshot: { name: contact.name, email: contact.email, phone: contact.phone },
          status: "waiting_store",
          lastMessageAt: contact.createdAt,
          unreadByAdmin: 1,
          unreadByCustomer: 0,
          legacyContactMessageId: contact._id,
          createdAt: contact.createdAt,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    conversation = await SupportConversation.findOne({ legacyContactMessageId: contact._id });
  }
  if (!conversation) throw new Error("LEGACY_CONVERSATION_CREATE_FAILED");
  await SupportMessage.findOneAndUpdate(
    { legacyContactMessageId: contact._id },
    {
      $setOnInsert: {
        conversationId: conversation._id,
        authorType: "customer",
        authorId: contact.user,
        body: contact.message,
        customerReadAt: contact.createdAt,
        adminReadAt: null,
        legacyContactMessageId: contact._id,
        createdAt: contact.createdAt,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return conversation;
}

export async function ensureLegacyConversations(customerId?: string) {
  await dbConnect();
  const cursor = ContactMessage.find(customerId ? { user: oid(customerId) } : {})
    .select("_id")
    .sort({ _id: 1 })
    .lean()
    .cursor();
  for await (const item of cursor) await upsertLegacyConversation(item._id);
}

function accessQuery(conversationId: string, actor: ConversationActor) {
  return isSupportAdmin(actor.role)
    ? { _id: oid(conversationId) }
    : { _id: oid(conversationId), customerId: oid(actor.id) };
}

export async function listConversations(actor: ConversationActor, options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}) {
  await ensureLegacyConversations(isSupportAdmin(actor.role) ? undefined : actor.id);
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(30, Math.max(1, Math.floor(Number(options.limit) || 15)));
  const filter: Record<string, unknown> = isSupportAdmin(actor.role)
    ? {}
    : { customerId: oid(actor.id) };
  if (["waiting_store", "waiting_customer", "closed"].includes(options.status || "")) {
    filter.status = options.status;
  }
  if (options.search?.trim() && isSupportAdmin(actor.role)) {
    const search = new RegExp(escapeRegExp(options.search.trim().slice(0, 80)), "i");
    filter.$or = [
      { subject: search },
      { "contactSnapshot.name": search },
      { "contactSnapshot.phone": search },
    ];
  }
  const [items, total] = await Promise.all([
    SupportConversation.find(filter)
      .populate("customerId", "username mobile email")
      .populate("orderId", "trackingCode invoiceNumber status finalPrice")
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SupportConversation.countDocuments(filter),
  ]);
  return { conversations: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getConversation(conversationId: string, actor: ConversationActor, markRead = true) {
  await dbConnect();
  const conversation = await SupportConversation.findOne(accessQuery(conversationId, actor))
    .populate("customerId", "username mobile email")
    .populate("orderId", "trackingCode invoiceNumber status finalPrice")
    .lean();
  if (!conversation) return null;
  const messages = await SupportMessage.find({ conversationId: conversation._id })
    .populate("authorId", "username mobile role")
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  if (markRead) {
    const admin = isSupportAdmin(actor.role);
    const now = new Date();
    await Promise.all([
      SupportConversation.updateOne(
        { _id: conversation._id },
        { $set: admin ? { unreadByAdmin: 0 } : { unreadByCustomer: 0 } },
      ),
      SupportMessage.updateMany(
        {
          conversationId: conversation._id,
          authorType: admin ? "customer" : "admin",
          [admin ? "adminReadAt" : "customerReadAt"]: null,
        },
        { $set: { [admin ? "adminReadAt" : "customerReadAt"]: now } },
      ),
    ]);
  }
  return { conversation, messages };
}

export async function addConversationMessage(
  conversationId: string,
  actor: ConversationActor,
  rawBody: string,
) {
  await dbConnect();
  const body = rawBody.normalize("NFKC").trim();
  if (!body || body.length > 2000 || /[<>]/.test(body)) throw new Error("INVALID_MESSAGE");
  const conversation = await SupportConversation.findOne(accessQuery(conversationId, actor));
  if (!conversation) return null;
  if (conversation.status === "closed") throw new Error("CONVERSATION_CLOSED");
  const admin = isSupportAdmin(actor.role);
  const message = await SupportMessage.create({
    conversationId: conversation._id,
    authorType: admin ? "admin" : "customer",
    authorId: oid(actor.id),
    body,
    adminReadAt: admin ? new Date() : null,
    customerReadAt: admin ? null : new Date(),
  });
  await SupportConversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        status: admin ? "waiting_customer" : "waiting_store",
        lastMessageAt: message.createdAt,
      },
      $inc: admin ? { unreadByCustomer: 1 } : { unreadByAdmin: 1 },
    },
  );
  if (admin) {
    await notifyUser({
      userId: conversation.customerId,
      title: `پاسخ فروشگاه: ${conversation.subject}`,
      message: "پاسخ جدیدی در گفتگوی پشتیبانی شما ثبت شده است.",
      type: "SUPPORT_REPLY",
      category: "support",
      entityType: "SupportConversation",
      entityId: conversation._id,
      link: `/my-profile?step=11&conversation=${conversation._id}`,
      senderType: "admin",
      senderId: actor.id,
      eventKey: `SUPPORT_REPLY:${message._id}`,
      priority: "high",
    });
  } else {
    await notifyAdmins({
      title: `پاسخ مشتری: ${conversation.subject}`,
      message: "مشتری در گفتگوی پشتیبانی پاسخ جدیدی ثبت کرده است.",
      type: "SUPPORT_MESSAGE",
      category: "support",
      entityType: "SupportConversation",
      entityId: conversation._id,
      link: `/dashboard/notifications?tab=conversations&conversation=${conversation._id}`,
      senderType: "user",
      senderId: actor.id,
      eventKey: `SUPPORT_MESSAGE:${message._id}`,
      priority: "high",
    });
  }
  return message;
}

export async function updateConversation(
  conversationId: string,
  actor: ConversationActor,
  input: { status?: string; orderId?: string | null },
) {
  await dbConnect();
  const conversation = await SupportConversation.findOne(accessQuery(conversationId, actor));
  if (!conversation) return null;
  const set: Record<string, unknown> = {};
  if (input.status) {
    if (!isSupportAdmin(actor.role) && input.status !== "closed") throw new Error("FORBIDDEN_STATUS");
    if (!["waiting_store", "waiting_customer", "closed"].includes(input.status)) throw new Error("INVALID_STATUS");
    set.status = input.status;
    set.closedAt = input.status === "closed" ? new Date() : null;
    set.closedBy = input.status === "closed" ? oid(actor.id) : null;
  }
  if (input.orderId !== undefined) {
    if (input.orderId === null) {
      set.orderId = null;
    } else {
      const order = await Order.exists({ _id: oid(input.orderId), user: conversation.customerId });
      if (!order) throw new Error("ORDER_NOT_OWNED");
      set.orderId = oid(input.orderId);
    }
  }
  if (!Object.keys(set).length) throw new Error("NO_CHANGES");
  return SupportConversation.findByIdAndUpdate(conversation._id, { $set: set }, { returnDocument: "after" });
}
