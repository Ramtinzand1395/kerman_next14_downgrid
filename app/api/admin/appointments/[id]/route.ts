import mongoose from "mongoose";
import Appointment from "@/model/Appointment";
import AppointmentReservation from "@/model/AppointmentReservation";
import VisitReward from "@/model/VisitReward";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import { appointmentAdminUpdateSchema } from "@/validations/appointment.validation";
import {
  canAdminTransition,
  canCourierTransition,
  AppointmentStatus,
  CourierStatus,
} from "@/lib/appointments/policy";
import { rescheduleAppointment } from "@/lib/appointments/service";
import {
  issueVisitRewards,
  redeemVisitReward,
  releaseVisitReward,
} from "@/lib/appointments/rewards.service";
import { notifyUser } from "@/lib/notifications/service";

const labels: Record<string, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

const courierLabels: Record<string, string> = {
  pending: "در انتظار",
  scheduled: "برنامه‌ریزی‌شده",
  assigned: "اختصاص‌یافته به پیک",
  picked_up: "تحویل‌گرفته‌شده توسط پیک",
  at_store: "رسیده به فروشگاه",
  return_ready: "آماده بازگشت",
  returning: "در حال بازگشت",
  delivered: "تحویل داده‌شده",
  cancelled: "لغوشده",
};

const courierMessages: Record<string, string> = {
  scheduled: "پیک برای دریافت دستگاه شما برنامه‌ریزی شد.",
  picked_up: "دستگاه شما توسط پیک تحویل گرفته شد.",
  at_store: "دستگاه شما به فروشگاه تحویل داده شد.",
  return_ready: "دستگاه شما آماده بازگشت با پیک است.",
  returning: "دستگاه شما در مسیر بازگشت است.",
  delivered: "دستگاه با موفقیت توسط پیک تحویل داده شد.",
  cancelled: "درخواست پیک لغو شد.",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه نامعتبر است", 422);
  const item = await Appointment.findById(id)
    .populate("user", "username mobile")
    .populate("selectedReward")
    .lean();
  return item ? ok(item) : fail("نوبت پیدا نشد", 404);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه نامعتبر است", 422);
  const parsed = appointmentAdminUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "درخواست نامعتبر است", 422);
  let current = await Appointment.findById(id);
  if (!current) return fail("نوبت پیدا نشد", 404);

  // Reschedule if requested
  if (parsed.data.startsAt || (parsed.data.pickupDate && parsed.data.pickupWindow)) {
    const moved = await rescheduleAppointment(
      String(current.user),
      id,
      parsed.data.startsAt
        ? parsed.data.startsAt
        : {
            pickupDate: parsed.data.pickupDate,
            pickupWindow: parsed.data.pickupWindow,
          },
    );
    if ("error" in moved && moved.error) return fail(moved.error, moved.status);
    current = await Appointment.findById(id);
    if (!current) return fail("نوبت پیدا نشد", 404);
  }

  const nextStatus = parsed.data.status;
  if (nextStatus && !canAdminTransition(current.status as AppointmentStatus, nextStatus)) {
    return fail("این انتقال وضعیت نوبت مجاز نیست.", 409);
  }

  const nextCourierStatus = parsed.data.courierStatus;
  if (nextCourierStatus) {
    if (current.fulfillment !== "courier" || !current.courier) {
      return fail("این نوبت فاقد پیک است و نمی‌توان وضعیت پیک را تغییر داد.", 422);
    }
    const currentCourierStatus = (current.courier.status || "pending") as CourierStatus;
    if (!canCourierTransition(currentCourierStatus, nextCourierStatus as CourierStatus)) {
      return fail("این انتقال وضعیت پیک مجاز نیست.", 409);
    }
  }

  const correctingCompletion = current.status === "completed" && nextStatus === "confirmed";
  if (correctingCompletion) {
    const issuedRewards = await VisitReward.find({ sourceAppointment: current._id })
      .select("status")
      .lean();
    if (issuedRewards.some((reward) => reward.status === "redeemed" || reward.status === "reserved")) {
      return fail(
        "اصلاح انجام خدمت ممکن نیست؛ یکی از پاداش‌های صادرشده مصرف یا برای نوبت دیگری رزرو شده است.",
        409,
      );
    }
    await VisitReward.updateMany(
      { sourceAppointment: current._id, status: { $in: ["available", "expired"] } },
      { $set: { status: "revoked" } },
    );
    if (current.selectedReward) {
      await VisitReward.updateOne(
        { _id: current.selectedReward, user: current.user, status: "redeemed", reservedFor: current._id },
        { $set: { status: "reserved", redeemedAt: null } },
      );
    }
  }

  if (nextStatus === "completed" && parsed.data.baseAmount === undefined) {
    return fail("برای ثبت انجام خدمت، مبلغ نهایی بررسی‌شده را وارد کنید.", 422);
  }

  const set: Record<string, unknown> = {};

  // Handle courier status transition timestamps
  if (nextCourierStatus && current.courier) {
    set["courier.status"] = nextCourierStatus;
    const now = new Date();
    if (nextCourierStatus === "picked_up" && !current.courier.pickupAt) {
      set["courier.pickupAt"] = now;
    }
    if (nextCourierStatus === "at_store" && !current.courier.arrivedAtStoreAt) {
      set["courier.arrivedAtStoreAt"] = now;
    }
    if (nextCourierStatus === "returning" && !current.courier.returnStartedAt) {
      set["courier.returnStartedAt"] = now;
    }
    if (nextCourierStatus === "delivered" && !current.courier.deliveredAt) {
      set["courier.deliveredAt"] = now;
    }
  }

  // Pricing calculation
  if (parsed.data.baseAmount !== undefined) {
    const serviceBaseAmount = Math.round(parsed.data.baseAmount);
    const shippingBaseAmount =
      current.pricing?.shippingBaseAmount ?? (current.courier?.totalShippingCost || 0);
    const deliveryCity = current.courier?.addressSnapshot?.city || "";

    const applied = await redeemVisitReward(
      {
        _id: current._id,
        user: current.user,
        serviceType: current.serviceType,
        fulfillment: current.fulfillment,
        selectedReward: current.selectedReward,
      },
      serviceBaseAmount,
      shippingBaseAmount,
      deliveryCity,
    );

    const serviceDiscount = applied.discount;
    const shippingDiscount = applied.shippingDiscount;
    const serviceFinalAmount = Math.max(0, serviceBaseAmount - serviceDiscount);
    const shippingFinalAmount = Math.max(0, shippingBaseAmount - shippingDiscount);
    const totalDiscountAmount = serviceDiscount + shippingDiscount;
    const finalAmount = serviceFinalAmount + shippingFinalAmount;

    set.pricing = {
      known: true,
      serviceBaseAmount,
      serviceDiscountAmount: serviceDiscount,
      serviceFinalAmount,
      shippingBaseAmount,
      shippingDiscountAmount: shippingDiscount,
      shippingFinalAmount,
      totalDiscountAmount,
      finalAmount,
      baseAmount: serviceBaseAmount,
      discountAmount: totalDiscountAmount,
    };

    if (current.courier) {
      set["courier.freeShippingDiscount"] = shippingDiscount;
      set["courier.finalShippingCost"] = shippingFinalAmount;
    }
  }

  if (nextStatus && nextStatus !== current.status) {
    set.status = nextStatus;
    if (nextStatus === "completed") {
      set.completedAt = new Date();
      set.rewardProcessingState = "pending";
    }
    if (correctingCompletion) {
      set.completedAt = null;
      set.visitCountedAt = null;
      set.rewardProcessingState = null;
    }
  }

  const update: Record<string, unknown> = { $set: set };
  const historyEntries: Array<Record<string, unknown>> = [];

  if (nextStatus && nextStatus !== current.status) {
    historyEntries.push({
      from: current.status,
      to: nextStatus,
      actorType: "admin",
      actor: auth.userId,
      note: parsed.data.note ?? "",
      at: new Date(),
    });
  }

  if (nextCourierStatus && nextCourierStatus !== current.courier?.status) {
    historyEntries.push({
      from: current.courier?.status || "pending",
      to: nextCourierStatus,
      actorType: "admin",
      actor: auth.userId,
      note: `تغییر وضعیت پیک: ${courierLabels[nextCourierStatus]}`,
      at: new Date(),
    });
  }

  if (historyEntries.length > 0) {
    update.$push = {
      history: { $each: historyEntries },
    };
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: current._id, status: current.status },
    update,
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) return fail("وضعیت نوبت هم‌زمان تغییر کرده است.", 409);

  if (nextStatus && ["cancelled", "rejected", "no_show"].includes(nextStatus)) {
    await Promise.all([
      AppointmentReservation.updateOne(
        { appointment: current._id, releasedAt: null },
        { $set: { releasedAt: new Date() } },
      ),
      releaseVisitReward(String(current._id)),
    ]);
  }

  if (nextStatus === "completed") {
    await issueVisitRewards(String(current._id)).catch((error) => {
      console.error("[appointments] visit reward issuance failed", error);
    });
  }

  // User notifications
  if (nextStatus && nextStatus !== current.status) {
    await notifyUser({
      userId: current.user,
      title: "وضعیت نوبت تغییر کرد",
      message: `وضعیت نوبت ${current.trackingCode} به «${labels[nextStatus]}» تغییر کرد.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: "/my-profile?step=5",
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `APPOINTMENT_STATUS:${current._id}:${nextStatus}`,
    }).catch(() => {});
  }

  if (nextCourierStatus && nextCourierStatus !== current.courier?.status) {
    const msg = courierMessages[nextCourierStatus] || `وضعیت پیک نوبت شما: ${courierLabels[nextCourierStatus]}`;
    await notifyUser({
      userId: current.user,
      title: "وضعیت پیک تغییر کرد",
      message: `${msg} (کد: ${current.trackingCode})`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: "/my-profile?step=5",
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `COURIER_STATUS:${current._id}:${nextCourierStatus}`,
    }).catch(() => {});
  }

  return ok(updated);
}
