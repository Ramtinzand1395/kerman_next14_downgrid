import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/policy";

export const appointmentCreateSchema = z.object({
  clientRequestKey: z.string().trim().min(8).max(128),
  serviceType: z.enum(["game_install", "repair"]),
  device: z.string().trim().min(2).max(60),
  installationType: z.enum(["account", "copy"]).nullable().optional(),
  repairIssue: z.enum(["power", "display", "controller", "sound", "overheating", "other"]).nullable().optional(),
  description: z.string().trim().max(1000).default(""),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^09\d{9}$/),
  startsAt: z.coerce.date(),
  selectedRewardId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  fulfillment: z.literal("in_store").default("in_store"),
});

export const appointmentUserUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), appointmentId: z.string().regex(/^[a-f\d]{24}$/i) }),
  z.object({ action: z.literal("reschedule"), appointmentId: z.string().regex(/^[a-f\d]{24}$/i), startsAt: z.coerce.date() }),
]);

export const appointmentAdminUpdateSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  startsAt: z.coerce.date().optional(),
  baseAmount: z.number().int().min(0).max(1_000_000_000).optional(),
  note: z.string().trim().max(500).optional(),
}).refine((value) => Object.keys(value).length > 0, "حداقل یک تغییر لازم است");

export const visitRewardRuleSchema = z.object({
  title: z.string().trim().min(2).max(120),
  requiredVisits: z.number().int().min(1).max(1000),
  eligibleServices: z.array(z.enum(["game_install", "repair"])).min(1),
  recurrence: z.enum(["once", "repeat"]),
  reward: z.object({
    type: z.enum(["fixed", "percent", "free_game", "free_shipping"]),
    value: z.number().min(0),
    maxDiscountAmount: z.number().int().min(0).nullable().optional(),
    minAmount: z.number().int().min(0).default(0),
    combinable: z.boolean().default(false),
    eligibleDevices: z.array(z.string()).default([]),
    eligibleInstallationTypes: z.array(z.enum(["account", "copy"])).default([]),
    shippingRegion: z.string().max(120).default(""),
    maxShippingCost: z.number().int().min(0).nullable().optional(),
    validityDays: z.number().int().min(1).max(3650),
  }),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(false),
});
