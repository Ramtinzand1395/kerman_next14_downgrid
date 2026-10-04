import crypto from "crypto";
import Appointment from "@/model/Appointment";
import AppointmentReservation from "@/model/AppointmentReservation";
import User from "@/model/User";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";
import { canonicalPayloadHash, cancellationAllowed, claimFirstAvailableSeat, ServiceType, slotKey, USER_CANCELLABLE_STATUSES } from "./policy";
import { getAppointmentSettings, slotIsConfigured, tehranDateKey } from "./settings";
import { releaseVisitReward, reserveVisitReward } from "./rewards.service";

export interface CreateAppointmentInput {
  clientRequestKey: string;
  serviceType: ServiceType;
  device: string;
  installationType?: "account" | "copy" | null;
  repairIssue?: "power" | "display" | "controller" | "sound" | "overheating" | "other" | null;
  description?: string;
  customerName: string;
  phone: string;
  startsAt: Date;
  selectedRewardId?: string | null;
}

function trackingCode() {
  return `KA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

async function acquireSeat(input: {
  appointmentId: string;
  userId: string;
  slotKey: string;
  capacity: number;
}) {
  await AppointmentReservation.updateMany(
    {
      slotKey: input.slotKey,
      releasedAt: null,
      finalizedAt: null,
      expiresAt: { $lte: new Date() },
    },
    { $set: { releasedAt: new Date() } },
  );
  const existing = await AppointmentReservation.findOne({
    appointment: input.appointmentId,
    slotKey: input.slotKey,
    releasedAt: null,
  });
  if (existing) return existing;
  return claimFirstAvailableSeat(input.capacity, async (seat) => {
    try {
      return await AppointmentReservation.create({
        appointment: input.appointmentId,
        user: input.userId,
        slotKey: input.slotKey,
        seat,
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const wonByRetry = await AppointmentReservation.findOne({
        appointment: input.appointmentId,
        slotKey: input.slotKey,
        releasedAt: null,
      });
      if (wonByRetry) return wonByRetry;
      return null;
    }
  });
}

function publicAppointment(appointment: Record<string, unknown>) {
  return appointment;
}

export async function createAppointment(userId: string, input: CreateAppointmentInput) {
  const settings = await getAppointmentSettings();
  const now = new Date();
  const dateKey = tehranDateKey(input.startsAt);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(input.startsAt);
  if (input.startsAt <= now || !slotIsConfigured(dateKey, time, settings)) {
    return { error: "این زمان قابل رزرو نیست.", status: 422 } as const;
  }
  const lastBookable = new Date(now.getTime() + settings.bookingDaysAhead * 86400_000);
  if (input.startsAt > lastBookable) {
    return { error: "این تاریخ خارج از بازه مجاز رزرو است.", status: 422 } as const;
  }
  if (!settings.supportedDevices.includes(input.device)) {
    return { error: "دستگاه انتخاب‌شده پشتیبانی نمی‌شود.", status: 422 } as const;
  }
  if (input.serviceType === "game_install" && !input.installationType) {
    return { error: "نوع نصب را انتخاب کنید.", status: 422 } as const;
  }
  if (input.serviceType === "repair" && !input.repairIssue) {
    return { error: "نوع مشکل را انتخاب کنید.", status: 422 } as const;
  }

  await Promise.all([Appointment.init(), AppointmentReservation.init()]);
  const hash = canonicalPayloadHash({
    serviceType: input.serviceType,
    device: input.device,
    installationType: input.installationType ?? null,
    repairIssue: input.repairIssue ?? null,
    description: input.description ?? "",
    customerName: input.customerName,
    phone: input.phone,
    startsAt: input.startsAt.toISOString(),
    selectedRewardId: input.selectedRewardId ?? null,
  });
  let appointment = await Appointment.findOne({
    user: userId,
    clientRequestKey: input.clientRequestKey,
  });
  if (appointment) {
    if (appointment.requestHash !== hash) {
      return { error: "این کلید قبلاً برای اطلاعات متفاوت استفاده شده است.", status: 409 } as const;
    }
    if (appointment.reservationFinalizedAt) {
      return { appointment: publicAppointment(appointment.toObject()), reused: true } as const;
    }
  } else {
    const activeCount = await Appointment.countDocuments({
      user: userId,
      status: { $in: ["pending", "confirmed"] },
      reservationFinalizedAt: { $ne: null },
    });
    if (activeCount >= settings.maxActiveAppointmentsPerUser) {
      return { error: "تعداد نوبت‌های فعال شما به سقف مجاز رسیده است.", status: 409 } as const;
    }
    const user = await User.findById(userId).select("_id");
    if (!user) return { error: "کاربر یافت نشد.", status: 404 } as const;
    const key = slotKey(input.serviceType, input.startsAt);
    try {
      appointment = await Appointment.create({
        user: userId,
        trackingCode: trackingCode(),
        clientRequestKey: input.clientRequestKey,
        requestHash: hash,
        serviceType: input.serviceType,
        device: input.device,
        installationType: input.serviceType === "game_install" ? input.installationType : null,
        repairIssue: input.serviceType === "repair" ? input.repairIssue : null,
        description: input.description ?? "",
        customerName: input.customerName,
        phone: input.phone,
        startsAt: input.startsAt,
        endsAt: new Date(input.startsAt.getTime() + settings.slotMinutes * 60_000),
        slotKey: key,
        history: [{ to: "pending", actorType: "user", actor: userId }],
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      appointment = await Appointment.findOne({ user: userId, clientRequestKey: input.clientRequestKey });
      if (!appointment || appointment.requestHash !== hash) {
        return { error: "کلید ثبت تکراری با درخواست دیگری تداخل دارد.", status: 409 } as const;
      }
    }
  }

  const capacity = Number(settings.serviceCapacity[input.serviceType]);
  const reservation = await acquireSeat({
    appointmentId: String(appointment._id),
    userId,
    slotKey: appointment.slotKey,
    capacity,
  });
  if (!reservation) {
    await Appointment.deleteOne({ _id: appointment._id, reservationFinalizedAt: null });
    return { error: "ظرفیت این ساعت تکمیل شده است. ساعت دیگری را انتخاب کنید.", status: 409 } as const;
  }

  if (input.selectedRewardId) {
    const reward = await reserveVisitReward(
      userId,
      input.selectedRewardId,
      String(appointment._id),
      input.serviceType,
      input.device,
      input.installationType,
    );
    if (!reward) {
      await AppointmentReservation.updateOne({ _id: reservation._id }, { $set: { releasedAt: new Date() } });
      await Appointment.deleteOne({ _id: appointment._id, reservationFinalizedAt: null });
      return { error: "پاداش انتخاب‌شده دیگر قابل استفاده نیست.", status: 409 } as const;
    }
    appointment.selectedReward = reward._id;
  }

  const finalizedAt = new Date();
  appointment.reservationFinalizedAt = finalizedAt;
  await appointment.save();
  await AppointmentReservation.updateOne(
    { _id: reservation._id, releasedAt: null },
    { $set: { finalizedAt }, $unset: { expiresAt: 1 } },
  );

  await Promise.all([
    notifyUser({
      userId,
      title: "نوبت شما ثبت شد",
      message: `نوبت ${input.serviceType === "repair" ? "پذیرش تعمیرات" : "نصب بازی"} با کد ${appointment.trackingCode} ثبت شد.`,
      type: "REQUEST_CREATED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: "/my-profile?step=5",
      eventKey: `APPOINTMENT_CREATED:${appointment._id}`,
    }),
    notifyAdmins({
      title: "نوبت جدید",
      message: `نوبت جدید ${input.serviceType === "repair" ? "تعمیرات" : "نصب بازی"} برای ${input.customerName} ثبت شد.`,
      type: "REQUEST_CREATED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: "/dashboard/appointments",
      priority: "high",
      eventKey: `ADMIN_APPOINTMENT_CREATED:${appointment._id}`,
    }),
  ]).catch((error) => console.error("[appointments] notification failed", error));
  return { appointment: publicAppointment(appointment.toObject()), reused: false } as const;
}

export async function cancelAppointment(userId: string, appointmentId: string) {
  const settings = await getAppointmentSettings();
  const current = await Appointment.findOne({ _id: appointmentId, user: userId });
  if (!current) return { error: "نوبت پیدا نشد.", status: 404 } as const;
  if (!USER_CANCELLABLE_STATUSES.includes(current.status)) {
    return { error: "این نوبت دیگر قابل لغو نیست.", status: 409 } as const;
  }
  if (!cancellationAllowed(current.startsAt, new Date(), settings.cancellationNoticeMinutes)) {
    return { error: "مهلت لغو این نوبت به پایان رسیده است.", status: 409 } as const;
  }
  const updated = await Appointment.findOneAndUpdate(
    { _id: current._id, user: userId, status: current.status },
    {
      $set: { status: "cancelled" },
      $push: { history: { from: current.status, to: "cancelled", actorType: "user", actor: userId, at: new Date() } },
    },
    { returnDocument: "after" },
  );
  if (!updated) return { error: "وضعیت نوبت هم‌زمان تغییر کرده است.", status: 409 } as const;
  await Promise.all([
    AppointmentReservation.updateOne({ appointment: current._id, releasedAt: null }, { $set: { releasedAt: new Date() } }),
    releaseVisitReward(String(current._id)),
  ]);
  return { appointment: updated.toObject() } as const;
}

export async function rescheduleAppointment(userId: string, appointmentId: string, startsAt: Date) {
  const settings = await getAppointmentSettings();
  const current = await Appointment.findOne({ _id: appointmentId, user: userId });
  if (!current) return { error: "نوبت پیدا نشد.", status: 404 } as const;
  if (!USER_CANCELLABLE_STATUSES.includes(current.status) || startsAt <= new Date()) {
    return { error: "جابه‌جایی این نوبت ممکن نیست.", status: 409 } as const;
  }
  const dateKey = tehranDateKey(startsAt);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false }).format(startsAt);
  if (!slotIsConfigured(dateKey, time, settings)) return { error: "زمان جدید قابل رزرو نیست.", status: 422 } as const;
  const nextKey = slotKey(current.serviceType, startsAt);
  if (nextKey === current.slotKey) return { appointment: current.toObject(), reused: true } as const;
  const reservation = await acquireSeat({
    appointmentId: String(current._id),
    userId,
    slotKey: nextKey,
    capacity: Number(settings.serviceCapacity[current.serviceType]),
  });
  if (!reservation) return { error: "ظرفیت زمان جدید تکمیل است.", status: 409 } as const;
  const updated = await Appointment.findOneAndUpdate(
    { _id: current._id, user: userId, slotKey: current.slotKey, status: current.status },
    {
      $set: { startsAt, endsAt: new Date(startsAt.getTime() + settings.slotMinutes * 60_000), slotKey: nextKey },
      $push: { history: { from: current.status, to: current.status, actorType: "user", actor: userId, note: "جابه‌جایی نوبت", at: new Date() } },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    await AppointmentReservation.updateOne({ _id: reservation._id }, { $set: { releasedAt: new Date() } });
    return { error: "جابه‌جایی انجام نشد؛ نوبت قبلی حفظ شد.", status: 409 } as const;
  }
  await AppointmentReservation.updateOne(
    { _id: reservation._id, appointment: current._id, slotKey: nextKey, releasedAt: null },
    { $set: { finalizedAt: new Date() }, $unset: { expiresAt: 1 } },
  );
  await AppointmentReservation.updateOne(
    { appointment: current._id, slotKey: current.slotKey, releasedAt: null },
    { $set: { releasedAt: new Date() } },
  );
  return { appointment: updated.toObject() } as const;
}
