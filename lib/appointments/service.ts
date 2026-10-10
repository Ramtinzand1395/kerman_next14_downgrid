import crypto from "crypto";
import Appointment from "@/model/Appointment";
import AppointmentReservation from "@/model/AppointmentReservation";
import Address from "@/model/Address";
import User from "@/model/User";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";
import {
  canonicalPayloadHash,
  cancellationAllowed,
  claimFirstAvailableSeat,
  computeAppointmentPricing,
  courierSlotKey,
  courierUserCancellationAllowed,
  FulfillmentType,
  ServiceType,
  slotKey,
  supportedDevicesForService,
  USER_CANCELLABLE_STATUSES,
} from "./policy";
import {
  courierWindowIsConfigured,
  findCourierRegion,
  getAppointmentSettings,
  isWindowInPast,
  slotIsConfigured,
  tehranDateKey,
  tehranDateTime,
} from "./settings";
import { releaseVisitReward, reserveVisitReward } from "./rewards.service";

export type CreateAppointmentInput =
  | {
      fulfillment?: "in_store";
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
  | {
      fulfillment: "courier";
      clientRequestKey: string;
      serviceType: ServiceType;
      device: string;
      installationType?: "account" | "copy" | null;
      repairIssue?: "power" | "display" | "controller" | "sound" | "overheating" | "other" | null;
      description?: string;
      customerName: string;
      phone: string;
      addressId: string;
      pickupDate: string;
      pickupWindow: { start: string; end: string };
      recipientName?: string;
      recipientPhone?: string;
      startsAt?: Date;
      selectedRewardId?: string | null;
    };

export interface RescheduleAppointmentInput {
  startsAt?: Date;
  pickupDate?: string;
  pickupWindow?: { start: string; end: string };
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
  const fulfillment: FulfillmentType = input.fulfillment || "in_store";

  const supportedDevices = supportedDevicesForService(
    input.serviceType,
    settings.supportedDevices,
  );
  if (!supportedDevices.includes(input.device)) {
    return { error: "دستگاه انتخاب‌شده پشتیبانی نمی‌شود.", status: 422 } as const;
  }
  if (input.serviceType === "game_install" && !input.installationType) {
    return { error: "نوع نصب را انتخاب کنید.", status: 422 } as const;
  }
  if (input.serviceType === "repair" && input.installationType) {
    return { error: "نوع نصب فقط برای PlayStation 4 و PlayStation 5 قابل انتخاب است.", status: 422 } as const;
  }
  if (input.serviceType === "repair" && !input.repairIssue) {
    return { error: "نوع مشکل را انتخاب کنید.", status: 422 } as const;
  }

  let startsAt: Date;
  let endsAt: Date;
  let key: string;
  let capacity: number;
  let courierPayload: Record<string, unknown> | null = null;
  let deliveryCity = "";
  let shippingBaseAmount = 0;

  if (fulfillment === "courier") {
    if (!settings.courierEnabled) {
      return { error: "خدمات پیک در حال حاضر غیرفعال است.", status: 422 } as const;
    }
    const courierInput = input as Extract<CreateAppointmentInput, { fulfillment: "courier" }>;
    const addressDoc = await Address.findOne({ _id: courierInput.addressId, userId }).lean();
    if (!addressDoc) {
      return { error: "آدرس انتخاب‌شده یافت نشد یا متعلق به شما نیست.", status: 422 } as const;
    }
    deliveryCity = addressDoc.city;

    const region = findCourierRegion(addressDoc.city, settings.courierRegions);
    if (!region) {
      return { error: "خدمات پیک در حال حاضر برای شهر شما فعال نیست.", status: 422 } as const;
    }

    const lastBookableDays = settings.courierBookingDaysAhead || 14;
    const lastBookable = new Date(now.getTime() + lastBookableDays * 86400_000);
    const parsedStart = tehranDateTime(courierInput.pickupDate, courierInput.pickupWindow.start);
    const parsedEnd = tehranDateTime(courierInput.pickupDate, courierInput.pickupWindow.end);
    if (!parsedStart || !parsedEnd) {
      return { error: "تاریخ یا ساعت پیک نامعتبر است.", status: 422 } as const;
    }
    if (parsedStart > lastBookable) {
      return { error: "این تاریخ خارج از بازه مجاز رزرو پیک است.", status: 422 } as const;
    }
    if (
      !courierWindowIsConfigured(courierInput.pickupDate, courierInput.pickupWindow, settings) ||
      isWindowInPast(courierInput.pickupDate, courierInput.pickupWindow.end, now)
    ) {
      return { error: "بازه انتخابی پیک در دسترس نیست.", status: 422 } as const;
    }

    startsAt = parsedStart;
    endsAt = parsedEnd;
    key = courierSlotKey(courierInput.pickupDate, courierInput.pickupWindow.start, courierInput.pickupWindow.end);
    capacity = Number(settings.courierCapacityPerWindow || 3);

    const pickupShippingCost = Number(region.shippingCost);
    const returnShippingCost =
      settings.courierRoundTripMultiplier > 1 ? pickupShippingCost : 0;
    const totalShippingCost = pickupShippingCost + returnShippingCost;
    shippingBaseAmount = totalShippingCost;

    courierPayload = {
      addressId: addressDoc._id,
      addressSnapshot: {
        title: "",
        province: addressDoc.province,
        city: addressDoc.city,
        address: addressDoc.address,
        plaque: addressDoc.plaque || "",
        unit: addressDoc.unit || "",
        postalCode: addressDoc.postalCode || "",
        recipientName: courierInput.recipientName?.trim() || courierInput.customerName.trim(),
        recipientPhone: courierInput.recipientPhone?.trim() || courierInput.phone.trim(),
      },
      regionId: region.id,
      regionTitle: region.title,
      pickupDate: new Date(`${courierInput.pickupDate}T00:00:00+03:30`),
      pickupWindow: courierInput.pickupWindow,
      status: "pending",
      pickupShippingCost,
      returnShippingCost,
      totalShippingCost,
      freeShippingDiscount: 0,
      finalShippingCost: totalShippingCost,
    };
  } else {
    const inStoreInput = input as Extract<CreateAppointmentInput, { fulfillment?: "in_store" }>;
    const dateKey = tehranDateKey(inStoreInput.startsAt);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(inStoreInput.startsAt);

    if (inStoreInput.startsAt <= now || !slotIsConfigured(dateKey, time, settings)) {
      return { error: "این زمان قابل رزرو نیست.", status: 422 } as const;
    }
    const lastBookable = new Date(now.getTime() + settings.bookingDaysAhead * 86400_000);
    if (inStoreInput.startsAt > lastBookable) {
      return { error: "این تاریخ خارج از بازه مجاز رزرو است.", status: 422 } as const;
    }

    startsAt = inStoreInput.startsAt;
    endsAt = new Date(inStoreInput.startsAt.getTime() + settings.slotMinutes * 60_000);
    key = slotKey(input.serviceType, startsAt);
    capacity = Number(settings.serviceCapacity[input.serviceType]);
  }

  await Promise.all([Appointment.init(), AppointmentReservation.init()]);

  const hashPayload: Record<string, unknown> = {
    fulfillment,
    serviceType: input.serviceType,
    device: input.device,
    installationType: input.installationType ?? null,
    repairIssue: input.repairIssue ?? null,
    description: input.description ?? "",
    customerName: input.customerName,
    phone: input.phone,
    startsAt: startsAt.toISOString(),
    selectedRewardId: input.selectedRewardId ?? null,
  };
  if (fulfillment === "courier") {
    const c = input as Extract<CreateAppointmentInput, { fulfillment: "courier" }>;
    hashPayload.addressId = c.addressId;
    hashPayload.pickupDate = c.pickupDate;
    hashPayload.pickupWindow = c.pickupWindow;
  }
  const hash = canonicalPayloadHash(hashPayload);

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

    const initialPricing = computeAppointmentPricing({
      fulfillment,
      serviceType: input.serviceType,
      serviceBaseAmount: null,
      shippingBaseAmount,
      reward: null,
      deliveryCity,
    });

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
        fulfillment,
        courier: courierPayload,
        startsAt,
        endsAt,
        slotKey: key,
        pricing: initialPricing,
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

  const reservation = await acquireSeat({
    appointmentId: String(appointment._id),
    userId,
    slotKey: appointment.slotKey,
    capacity,
  });
  if (!reservation) {
    await Appointment.deleteOne({ _id: appointment._id, reservationFinalizedAt: null });
    return {
      error:
        fulfillment === "courier"
          ? "ظرفیت پیک در این بازه تکمیل شده است. بازه دیگری را انتخاب کنید."
          : "ظرفیت این ساعت تکمیل شده است. ساعت دیگری را انتخاب کنید.",
      status: 409,
    } as const;
  }

  if (input.selectedRewardId) {
    const reward = await reserveVisitReward(
      userId,
      input.selectedRewardId,
      String(appointment._id),
      input.serviceType,
      input.device,
      input.installationType,
      fulfillment,
      deliveryCity,
    );
    if (!reward) {
      await AppointmentReservation.updateOne({ _id: reservation._id }, { $set: { releasedAt: new Date() } });
      await Appointment.deleteOne({ _id: appointment._id, reservationFinalizedAt: null });
      return { error: "پاداش انتخاب‌شده قابل استفاده برای این درخواست نیست.", status: 409 } as const;
    }
    appointment.selectedReward = reward._id;

    const rewardDetails = (reward.snapshot as { reward?: Parameters<typeof computeAppointmentPricing>[0]["reward"] })?.reward;
    const updatedPricing = computeAppointmentPricing({
      fulfillment,
      serviceType: input.serviceType,
      serviceBaseAmount: null,
      shippingBaseAmount,
      reward: rewardDetails,
      deliveryCity,
    });
    appointment.pricing = updatedPricing;
    if (appointment.courier && rewardDetails?.type === "free_shipping") {
      appointment.courier.freeShippingDiscount = updatedPricing.shippingDiscountAmount;
      appointment.courier.finalShippingCost = updatedPricing.shippingFinalAmount;
    }
  }

  const finalizedAt = new Date();
  appointment.reservationFinalizedAt = finalizedAt;
  await appointment.save();
  await AppointmentReservation.updateOne(
    { _id: reservation._id, releasedAt: null },
    { $set: { finalizedAt }, $unset: { expiresAt: 1 } },
  );

  const isCourier = fulfillment === "courier";
  const serviceLabel = input.serviceType === "repair" ? "تعمیرات" : "نصب بازی";
  await Promise.all([
    notifyUser({
      userId,
      title: isCourier ? "درخواست خدمات با پیک ثبت شد" : "نوبت شما ثبت شد",
      message: isCourier
        ? `درخواست پیک برای ${serviceLabel} با کد ${appointment.trackingCode} ثبت شد.`
        : `نوبت ${input.serviceType === "repair" ? "پذیرش تعمیرات" : "نصب بازی"} با کد ${appointment.trackingCode} ثبت شد.`,
      type: "REQUEST_CREATED",
      category: "request",
      entityType: "Appointment",
      entityId: appointment._id,
      link: "/my-profile?step=5",
      eventKey: `APPOINTMENT_CREATED:${appointment._id}`,
    }),
    notifyAdmins({
      title: isCourier ? "درخواست جدید پیک" : "نوبت جدید",
      message: `${isCourier ? "درخواست پیک" : "نوبت حضوری"} ${serviceLabel} برای ${input.customerName} ثبت شد.`,
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
  if (current.fulfillment === "courier" && current.courier) {
    if (!courierUserCancellationAllowed(current.courier.status)) {
      return {
        error: "دستگاه قبلاً توسط پیک تحویل گرفته شده و امکان لغو وجود ندارد.",
        status: 409,
      } as const;
    }
  }
  if (!cancellationAllowed(current.startsAt, new Date(), settings.cancellationNoticeMinutes)) {
    return { error: "مهلت لغو این نوبت به پایان رسیده است.", status: 409 } as const;
  }

  const updateSet: Record<string, unknown> = { status: "cancelled" };
  if (current.fulfillment === "courier" && current.courier) {
    updateSet["courier.status"] = "cancelled";
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: current._id, user: userId, status: current.status },
    {
      $set: updateSet,
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

export async function rescheduleAppointment(
  userId: string,
  appointmentId: string,
  rescheduleInput: Date | RescheduleAppointmentInput,
) {
  const settings = await getAppointmentSettings();
  const current = await Appointment.findOne({ _id: appointmentId, user: userId });
  if (!current) return { error: "نوبت پیدا نشد.", status: 404 } as const;
  if (!USER_CANCELLABLE_STATUSES.includes(current.status)) {
    return { error: "جابه‌جایی این نوبت ممکن نیست.", status: 409 } as const;
  }

  const now = new Date();

  if (current.fulfillment === "courier") {
    if (current.courier && !courierUserCancellationAllowed(current.courier.status)) {
      return { error: "دستگاه تحویل گرفته شده و امکان تغییر زمان وجود ندارد.", status: 409 } as const;
    }
    const inputObj = (
      rescheduleInput instanceof Date ? null : rescheduleInput
    ) as RescheduleAppointmentInput | null;
    if (!inputObj?.pickupDate || !inputObj.pickupWindow) {
      return { error: "تاریخ و بازه جدید پیک الزامی است.", status: 422 } as const;
    }
    const { pickupDate, pickupWindow } = inputObj;
    const parsedStart = tehranDateTime(pickupDate, pickupWindow.start);
    const parsedEnd = tehranDateTime(pickupDate, pickupWindow.end);
    if (!parsedStart || !parsedEnd || parsedStart <= now) {
      return { error: "زمان جدید پیک نامعتبر یا گذشته است.", status: 422 } as const;
    }
    if (
      !courierWindowIsConfigured(pickupDate, pickupWindow, settings) ||
      isWindowInPast(pickupDate, pickupWindow.end, now)
    ) {
      return { error: "بازه جدید پیک در دسترس نیست.", status: 422 } as const;
    }

    const nextKey = courierSlotKey(pickupDate, pickupWindow.start, pickupWindow.end);
    if (nextKey === current.slotKey) return { appointment: current.toObject(), reused: true } as const;

    const reservation = await acquireSeat({
      appointmentId: String(current._id),
      userId,
      slotKey: nextKey,
      capacity: Number(settings.courierCapacityPerWindow || 3),
    });
    if (!reservation) return { error: "ظرفیت بازه جدید پیک تکمیل است.", status: 409 } as const;

    const updated = await Appointment.findOneAndUpdate(
      { _id: current._id, user: userId, slotKey: current.slotKey, status: current.status },
      {
        $set: {
          startsAt: parsedStart,
          endsAt: parsedEnd,
          slotKey: nextKey,
          "courier.pickupDate": new Date(`${pickupDate}T00:00:00+03:30`),
          "courier.pickupWindow": pickupWindow,
        },
        $push: {
          history: {
            from: current.status,
            to: current.status,
            actorType: "user",
            actor: userId,
            note: "جابه‌جایی زمان پیک",
            at: new Date(),
          },
        },
      },
      { returnDocument: "after" },
    );
    if (!updated) {
      await AppointmentReservation.updateOne({ _id: reservation._id }, { $set: { releasedAt: new Date() } });
      return { error: "جابه‌جایی انجام نشد؛ بازه قبلی حفظ شد.", status: 409 } as const;
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

  // In-store rescheduling
  const startsAt =
    rescheduleInput instanceof Date ? rescheduleInput : rescheduleInput.startsAt;
  if (!startsAt || startsAt <= now) {
    return { error: "زمان جدید نوبت نامعتبر یا گذشته است.", status: 422 } as const;
  }
  const dateKey = tehranDateKey(startsAt);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startsAt);
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
