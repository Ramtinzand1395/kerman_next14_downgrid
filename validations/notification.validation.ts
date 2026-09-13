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
