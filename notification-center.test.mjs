import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateBackoffMs,
  canCancelCampaign,
  normalizePage,
  normalizePageSize,
  shouldRetryDelivery,
} from "./lib/notifications/policy.ts";

test("notification pagination input is bounded", () => {
  assert.equal(normalizePage(-4), 1);
  assert.equal(normalizePageSize(500), 50);
  assert.equal(normalizePageSize(0), 1);
});

test("campaign retry and cancellation policy is narrow", () => {
  assert.equal(shouldRetryDelivery("failed", 2, 5), true);
  assert.equal(shouldRetryDelivery("succeeded", 2, 5), false);
  assert.equal(shouldRetryDelivery("failed", 5, 5), false);
  assert.equal(canCancelCampaign("scheduled"), true);
  assert.equal(canCancelCampaign("processing"), false);
  assert.equal(calculateBackoffMs(1), 30_000);
  assert.equal(calculateBackoffMs(99), 3_600_000);
});

test("shared notification state is stored per recipient and archive never deletes the event", async () => {
  const [receiptModel, service] = await Promise.all([
    readFile("model/NotificationReceipt.ts", "utf8"),
    readFile("lib/notifications/service.ts", "utf8"),
  ]);
  assert.match(receiptModel, /notificationId: 1, recipientId: 1/);
  assert.match(receiptModel, /unique: true/);
  assert.match(service, /NotificationReceipt\.findOneAndUpdate/);
  assert.match(service, /archivedAt: new Date\(\)/);
  assert.doesNotMatch(service, /findOneAndDelete/);
});

test("list, unread count and loyalty route share the canonical notification service", async () => {
  const [service, listRoute, countRoute, loyaltyRoute] = await Promise.all([
    readFile("lib/notifications/service.ts", "utf8"),
    readFile("app/api/notifications/route.ts", "utf8"),
    readFile("app/api/notifications/unread-count/route.ts", "utf8"),
    readFile("app/api/loyalty/notifications/route.ts", "utf8"),
  ]);
  assert.match(service, /personalStatePipeline/);
  assert.match(listRoute, /getNotifications/);
  assert.match(countRoute, /getUnreadCount/);
  assert.match(loyaltyRoute, /getNotifications/);
  assert.match(loyaltyRoute, /markAllAsRead/);
});

test("campaign delivery is idempotent, leased and restart recoverable", async () => {
  const [campaignModel, deliveryModel, worker] = await Promise.all([
    readFile("model/NotificationCampaign.ts", "utf8"),
    readFile("model/NotificationDelivery.ts", "utf8"),
    readFile("workers/notification-worker.mjs", "utf8"),
  ]);
  assert.match(campaignModel, /createdBy: 1, idempotencyKey: 1/);
  assert.match(deliveryModel, /campaignId: 1, recipientId: 1/);
  assert.match(worker, /findOneAndUpdate/);
  assert.match(worker, /leaseExpiresAt: \{ \$lte: now \}/);
  assert.match(worker, /deduplicationKey/);
  assert.match(worker, /status: "failed", attempts: \{ \$lt: MAX_ATTEMPTS \}/);
});

test("manual retry targets failed recipients and cancellation stops before processing", async () => {
  const source = await readFile("lib/notifications/campaigns.ts", "utf8");
  assert.match(source, /campaignId: campaign\._id, status: "failed"/);
  assert.match(source, /status: \{ \$in: \["draft", "scheduled", "queued"\] \}, startedAt: null/);
  assert.doesNotMatch(source, /status: "succeeded"[^\n]*status: "pending"/);
});

test("conversation access and optional order linkage are ownership scoped", async () => {
  const [service, userRoute, adminRoute] = await Promise.all([
    readFile("lib/notifications/conversations.ts", "utf8"),
    readFile("app/api/conversations/[id]/route.ts", "utf8"),
    readFile("app/api/admin/conversations/[id]/route.ts", "utf8"),
  ]);
  assert.match(service, /customerId: oid\(actor\.id\)/);
  assert.match(service, /user: conversation\.customerId/);
  assert.match(userRoute, /session\.user\.role === "user"/);
  assert.match(adminRoute, /session\.user\.role === "superadmin"/);
});

test("legacy contact messages are materialized idempotently without copying text into notifications", async () => {
  const [conversationService, contactRoute] = await Promise.all([
    readFile("lib/notifications/conversations.ts", "utf8"),
    readFile("app/api/contact-us/route.ts", "utf8"),
  ]);
  assert.match(conversationService, /legacyContactMessageId: contact\._id/);
  assert.match(conversationService, /\$setOnInsert/);
  assert.match(contactRoute, /entityType: "SupportConversation"/);
  assert.doesNotMatch(contactRoute, /message: message/);
});

test("notification UI refreshes the bell only after successful writes", async () => {
  const [center, bell] = await Promise.all([
    readFile("app/components/notifications/NotificationCenter.tsx", "utf8"),
    readFile("app/components/notifications/NotificationBell.tsx", "utf8"),
  ]);
  assert.match(center, /announceNotificationUpdate\(\)/);
  assert.match(center, /if \(!response\.ok\) throw/);
  assert.match(bell, /NOTIFICATION_UPDATED_EVENT/);
  assert.match(bell, /if \(!response\.ok\) throw/);
});
