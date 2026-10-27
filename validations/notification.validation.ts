import { z } from "zod";
import { NOTIFICATION_PRIORITIES } from "@/lib/notifications/constants";

const safeLink = z.string().trim().max(1000).refine(
  (value) => value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\"),
  "لینک باید یک مسیر داخلی سایت باشد",
).optional().or(z.literal(""));

export const adminSendNotificationSchema = z.object({
  recipient: z.enum(["user", "allUsers"]),
  recipientId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(2000),
  priority: z.enum(NOTIFICATION_PRIORITIES).default("normal"),
  link: safeLink,
}).superRefine((value, context) => {
  if (value.recipient === "user" && !value.recipientId) {
    context.addIssue({ code: "custom", path: ["recipientId"], message: "انتخاب کاربر الزامی است" });
  }
});

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const campaignAudienceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("selected"), userIds: z.array(objectId).min(1).max(500) }),
  z.object({ kind: z.literal("all_users") }),
  z.object({ kind: z.literal("product_buyers"), productId: objectId }),
  z.object({ kind: z.literal("category_buyers"), categoryId: objectId }),
  z.object({ kind: z.literal("active_orders") }),
]);

export const notificationCampaignSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(2000),
  priority: z.enum(NOTIFICATION_PRIORITIES).default("normal"),
  link: safeLink,
  audience: campaignAudienceSchema,
  mode: z.enum(["draft", "send"]).default("send"),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
}).superRefine((value, context) => {
  if (value.mode === "draft" && value.scheduledAt) {
    context.addIssue({ code: "custom", path: ["scheduledAt"], message: "پیش‌نویس زمان‌بندی نمی‌شود." });
  }
  if (value.scheduledAt) {
    const time = new Date(value.scheduledAt).getTime();
    if (time > Date.now() + 366 * 24 * 60 * 60 * 1000) {
      context.addIssue({ code: "custom", path: ["scheduledAt"], message: "زمان‌بندی بیش از یک سال مجاز نیست." });
    }
  }
});
