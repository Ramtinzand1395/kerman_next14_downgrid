import mongoose from "mongoose";
import Appointment from "@/model/Appointment";
import AppointmentReservation from "@/model/AppointmentReservation";
import VisitReward from "@/model/VisitReward";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import { appointmentAdminUpdateSchema } from "@/validations/appointment.validation";
import { canAdminTransition, AppointmentStatus } from "@/lib/appointments/policy";
import { rescheduleAppointment } from "@/lib/appointments/service";
import { issueVisitRewards, redeemVisitReward, releaseVisitReward } from "@/lib/appointments/rewards.service";
import { notifyUser } from "@/lib/notifications/service";

const labels: Record<string, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  no_show: "عدم مراجعه",
  rejected: "ردشده",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه نامعتبر است", 422);
  const item = await Appointment.findById(id).populate("user", "username mobile").populate("selectedReward").lean();
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

  if (parsed.data.startsAt) {
    const moved = await rescheduleAppointment(String(current.user), id, parsed.data.startsAt);
    if ("error" in moved && moved.error) return fail(moved.error, moved.status);
    current = await Appointment.findById(id);
    if (!current) return fail("نوبت پیدا نشد", 404);
  }

  const nextStatus = parsed.data.status;
  if (nextStatus && !canAdminTransition(current.status as AppointmentStatus, nextStatus)) {
    return fail("این انتقال وضعیت مجاز نیست.", 409);
  }
  const correctingCompletion = current.status === "completed" && nextStatus === "confirmed";
  if (correctingCompletion) {
    const issuedRewards = await VisitReward.find({ sourceAppointment: current._id }).select("status").lean();
    if (issuedRewards.some((reward) => reward.status === "redeemed" || reward.status === "reserved")) {
      return fail("اصلاح انجام خدمت ممکن نیست؛ یکی از پاداش‌های صادرشده مصرف یا برای نوبت دیگری رزرو شده است.", 409);
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
  if (parsed.data.baseAmount !== undefined) {
    const baseAmount = Math.round(parsed.data.baseAmount);
    const applied = await redeemVisitReward(
      {
        _id: current._id,
        user: current.user,
        serviceType: current.serviceType,
        selectedReward: current.selectedReward,
      },
      baseAmount,
    );
    if (!applied.reward && current.selectedReward) await releaseVisitReward(String(current._id));
    set.pricing = {
      known: true,
      baseAmount,
      discountAmount: applied.discount,
      finalAmount: Math.max(0, baseAmount - applied.discount),
    };
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
  if (nextStatus && nextStatus !== current.status) {
    update.$push = {
      history: {
        from: current.status,
        to: nextStatus,
        actorType: "admin",
        actor: auth.userId,
        note: parsed.data.note ?? "",
        at: new Date(),
      },
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
      AppointmentReservation.updateOne({ appointment: current._id, releasedAt: null }, { $set: { releasedAt: new Date() } }),
      releaseVisitReward(String(current._id)),
    ]);
  }
  if (nextStatus === "completed") {
    await issueVisitRewards(String(current._id)).catch((error) => {
      console.error("[appointments] visit reward issuance failed", error);
    });
  }
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
  return ok(updated);
}
