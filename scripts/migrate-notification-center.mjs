import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI (or TEST_MONGODB_URI) before running this script.");

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection.db;
const notifications = db.collection("notifications");
const contacts = db.collection("contactmessages");
const conversations = db.collection("supportconversations");
const messages = db.collection("supportmessages");

const [legacyNotifications, legacyContacts, existingLegacyConversations] = await Promise.all([
  notifications.countDocuments({ handlingStatus: { $exists: false } }),
  contacts.countDocuments(),
  conversations.countDocuments({ legacyContactMessageId: { $type: "objectId" } }),
]);

process.stdout.write(`${JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  legacyNotifications,
  legacyContacts,
  existingLegacyConversations,
  conversationsToMaterialize: Math.max(0, legacyContacts - existingLegacyConversations),
}, null, 2)}\n`);

if (apply) {
  await Promise.all([
    db.collection("notificationreceipts").createIndex({ notificationId: 1, recipientId: 1 }, { unique: true }),
    db.collection("notificationcampaigns").createIndex({ createdBy: 1, idempotencyKey: 1 }, { unique: true }),
    db.collection("notificationdeliveries").createIndex({ campaignId: 1, recipientId: 1 }, { unique: true }),
    conversations.createIndex({ legacyContactMessageId: 1 }, { unique: true, partialFilterExpression: { legacyContactMessageId: { $type: "objectId" } } }),
    messages.createIndex({ legacyContactMessageId: 1 }, { unique: true, partialFilterExpression: { legacyContactMessageId: { $type: "objectId" } } }),
  ]);
  await notifications.updateMany(
    { handlingStatus: { $exists: false } },
    { $set: { handlingStatus: "pending", handledAt: null, handledBy: null } },
  );

  const cursor = contacts.find().sort({ _id: 1 });
  for await (const contact of cursor) {
    const now = contact.createdAt || new Date();
    const conversationResult = await conversations.findOneAndUpdate(
      { legacyContactMessageId: contact._id },
      {
        $setOnInsert: {
          customerId: contact.user,
          subject: contact.subject,
          contactSnapshot: { name: contact.name, email: contact.email, phone: contact.phone },
          orderId: null,
          status: "waiting_store",
          lastMessageAt: now,
          unreadByAdmin: 1,
          unreadByCustomer: 0,
          legacyContactMessageId: contact._id,
          closedAt: null,
          closedBy: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    await messages.updateOne(
      { legacyContactMessageId: contact._id },
      {
        $setOnInsert: {
          conversationId: conversationResult._id,
          authorType: "customer",
          authorId: contact.user,
          body: contact.message,
          adminReadAt: null,
          customerReadAt: now,
          legacyContactMessageId: contact._id,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
  process.stdout.write("Migration applied idempotently.\n");
}

await mongoose.disconnect();
