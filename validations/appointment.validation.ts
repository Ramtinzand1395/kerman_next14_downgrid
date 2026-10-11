import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  COURIER_STATUSES,
  normalizeRewardRuleData,
  validateRewardRuleData,
} from "@/lib/appointments/policy";

export { normalizeRewardRuleData, validateRewardRuleData };

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const objectIdRegex = /^[a-f\d]{24}$/i;
const phoneRegex = /^09\d{9}$/;
const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

const baseAppointmentSchema = z.object({
  clientRequestKey: z.string().trim().min(8).max(128),
  serviceType: z.enum(["game_install", "repair"]),
  device: z.string().trim().min(2).max(60),
  installationType: z.enum(["account", "copy"]).nullable().optional(),
  repairIssue: z.enum(["power", "display", "controller", "sound", "overheating", "other"]).nullable().optional(),
  description: z.string().trim().max(1000).default(""),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().regex(phoneRegex, "شماره موبایل نامعتبر است"),
  selectedRewardId: z.string().regex(objectIdRegex, "شناسه پاداش نامعتبر است").nullable().optional(),
});

export const inStoreAppointmentCreateSchema = baseAppointmentSchema.extend({
  fulfillment: z.literal("in_store").default("in_store"),
  startsAt: z.coerce.date(),
});

export const courierAppointmentCreateSchema = baseAppointmentSchema.extend({
  fulfillment: z.literal("courier"),
  addressId: z.string().regex(objectIdRegex, "شناسه آدرس نامعتبر است"),
  pickupDate: z.string().regex(dateStringRegex, "فرمت تاریخ تحویل نامعتبر است"),
  pickupWindow: z.object({
    start: z.string().regex(timeRegex, "زمان شروع بازه نامعتبر است"),
    end: z.string().regex(timeRegex, "زمان پایان بازه نامعتبر است"),
  }),
  recipientName: z.string().trim().min(2).max(100).optional(),
  recipientPhone: z.string().regex(phoneRegex, "شماره تماس گیرنده نامعتبر است").optional(),
  startsAt: z.coerce.date().optional(),
});

export const appointmentCreateSchema = z.preprocess(
  (val) => {
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (!obj.fulfillment) {
        return { ...obj, fulfillment: "in_store" };
      }
    }
    return val;
  },
  z.discriminatedUnion("fulfillment", [
    inStoreAppointmentCreateSchema,
    courierAppointmentCreateSchema,
  ]),
);

export const appointmentUserUpdateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    appointmentId: z.string().regex(objectIdRegex, "شناسه نوبت نامعتبر است"),
  }),
  z.object({
    action: z.literal("reschedule"),
    appointmentId: z.string().regex(objectIdRegex, "شناسه نوبت نامعتبر است"),
    startsAt: z.coerce.date().optional(),
    pickupDate: z.string().regex(dateStringRegex, "فرمت تاریخ تحویل نامعتبر است").optional(),
    pickupWindow: z
      .object({
        start: z.string().regex(timeRegex, "زمان شروع بازه نامعتبر است"),
        end: z.string().regex(timeRegex, "زمان پایان بازه نامعتبر است"),
      })
      .optional(),
  }).refine((data) => data.startsAt || (data.pickupDate && data.pickupWindow), {
    message: "زمان جدید یا بازه پیک الزامی است.",
  }),
]);

export const appointmentAdminUpdateSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    courierStatus: z.enum(COURIER_STATUSES).optional(),
    startsAt: z.coerce.date().optional(),
    pickupDate: z.string().regex(dateStringRegex).optional(),
    pickupWindow: z
      .object({
        start: z.string().regex(timeRegex),
        end: z.string().regex(timeRegex),
      })
      .optional(),
    baseAmount: z.number().int().min(0).max(1_000_000_000).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "حداقل یک تغییر لازم است");

export const visitRewardRuleSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    requiredVisits: z.number().int().min(1).max(1000),
    eligibleServices: z.array(z.enum(["game_install", "repair"])).min(1),
    recurrence: z.enum(["once", "repeat"]),
    reward: z.object({
      type: z.enum(["fixed", "percent", "free_game", "free_shipping"]),
      value: z.number().min(0).default(0),
      maxDiscountAmount: z.number().int().min(0).nullable().optional(),
      minAmount: z.number().int().min(0).default(0),
      combinable: z.boolean().default(false),
      eligibleDevices: z.array(z.string()).default([]),
      eligibleInstallationTypes: z.array(z.enum(["account", "copy"])).default([]),
      shippingRegion: z.string().max(120).default(""),
      maxShippingCost: z.number().int().min(0).nullable().optional(),
      validityDays: z.number().int().min(1).max(3650).default(30),
    }),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const val = validateRewardRuleData(data);
    if (!val.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: val.error || "قانون نامعتبر است.",
        path: ["reward"],
      });
    }
  });
