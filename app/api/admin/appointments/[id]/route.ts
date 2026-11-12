import mongoose, { type ClientSession } from "mongoose";
import Customer from "@/model/Customer";
import GameList from "@/model/GameList";
import {
  catalogPlatformAliases, gameKey, installationCatalog, installationPlatforms,
  installationSize, resolveInstallationGames, type GameCatalogDocument, type InstallationGame,
} from "@/lib/appointments/games";
import Appointment from "@/model/Appointment";
import AppointmentReservation from "@/model/AppointmentReservation";
import VisitReward from "@/model/VisitReward";
import { requireAppointmentOperator, ok, fail } from "@/lib/loyalty/api";
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
import { courierStatusAfterService } from "@/lib/appointments/courier-policy";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";
import { deliverBusinessSms } from "@/lib/sms/business";

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
  assigned: "حرکت از فروشگاه به سمت مشتری",
  picked_up: "تحویل دستگاه به پیک",
  at_store: "تحویل دستگاه به مغازه",
  return_ready: "تکمیل خدمات و آماده ارسال",
  returning: "حرکت به سمت مشتری پس از خدمات",
  delivered: "تحویل به مشتری",
  cancelled: "لغوشده",
};

const courierMessages: Record<string, string> = {
  assigned: "پیک برای دریافت دستگاه از فروشگاه به سمت شما حرکت کرد.",
  pending: "خدمت شما برای بررسی مجدد بازگشایی شد و ارسال دستگاه منتظر تکمیل خدمت است.",
  picked_up: "دستگاه شما توسط پیک تحویل گرفته شد.",
  at_store: "دستگاه شما به فروشگاه تحویل داده شد.",
  return_ready: "خدمات دستگاه شما تکمیل شده و آماده ارسال با پیک است.",
  returning: "پیک پس از پایان خدمات با دستگاه شما به سمت آدرس شما حرکت کرد.",
  delivered: "دستگاه با موفقیت توسط پیک تحویل داده شد.",
  cancelled: "درخواست پیک لغو شد.",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppointmentOperator();
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
  const auth = await requireAppointmentOperator();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("شناسه نامعتبر است", 422);
  const parsed = appointmentAdminUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "درخواست نامعتبر است", 422);
  let current = await Appointment.findById(id);
  if (!current) return fail("نوبت پیدا نشد", 404);

  const {
    selectedGames, registerStoreOrder, expectedUpdatedAt,
    storeOrderCustomerId, storeOrderDescription, deliverStoreOrder,
  } = parsed.data;
  const isCourier = current.fulfillment === "courier";
  if (expectedUpdatedAt && current.updatedAt?.toISOString() !== expectedUpdatedAt) {
    return fail("این سفارش تغییر کرده است؛ اطلاعات را دوباره دریافت کنید.", 409);
  }
  const editingOrder = Boolean(selectedGames || registerStoreOrder);
  if ((storeOrderCustomerId || storeOrderDescription !== undefined) && !registerStoreOrder) {
    return fail("تغییر اطلاعات فرم فقط هنگام ثبت سفارش مجاز است.", 422);
  }
  if (deliverStoreOrder) {
    if (isCourier || current.status !== "completed" || !current.storeOrderRegisteredAt ||
        Object.keys(parsed.data).some((key) => !["deliverStoreOrder", "expectedUpdatedAt"].includes(key))) {
      return fail("این سفارش برای تحویل حضوری آماده نیست.", 409);
    }
    if (current.storeOrderDeliveredAt) return ok(current);
    const delivered = await Appointment.findOneAndUpdate(
      { _id: current._id, status: "completed", updatedAt: current.updatedAt, storeOrderDeliveredAt: null },
      { $set: { storeOrderDeliveredAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!delivered) return fail("سفارش هم‌زمان تغییر کرده است.", 409);
    await notifyUser({
      userId: current.user,
      title: "دستگاه تحویل داده شد",
      message: `تحویل حضوری دستگاه سفارش ${current.trackingCode} ثبت شد.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: `/my-profile?step=5&ordersTab=games#appointment-${current._id}`,
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `APPOINTMENT_STORE_DELIVERED:${current._id}`,
    }).catch((error) => console.error("[appointments] store delivery notification failed", error));
    return ok(delivered);
  }
  if (editingOrder && (
    !["pending", "confirmed"].includes(current.status) ||
    (registerStoreOrder && (current.status !== "confirmed" || (isCourier && current.courier?.status !== "at_store"))) ||
    (selectedGames && current.serviceType !== "game_install") ||
    parsed.data.status || parsed.data.courierStatus || parsed.data.startsAt ||
    parsed.data.pickupDate || parsed.data.pickupWindow
  )) {
    return fail("در این مرحله امکان ویرایش یا ثبت سفارش وجود ندارد.", 409);
  }

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
  if (nextStatus === "completed" && current.status === "completed") return ok(current);
  if ((editingOrder || parsed.data.baseAmount !== undefined || nextStatus === "confirmed") &&
      ["initiating", "pending", "paid"].includes(current.payment?.status)) {
    return fail("درخواست در حال پرداخت یا پرداخت‌شده است؛ تغییر مبلغ و بازگشایی مجاز نیست.", 409);
  }
  if (nextStatus && !canAdminTransition(current.status as AppointmentStatus, nextStatus)) {
    return fail("این انتقال وضعیت نوبت مجاز نیست.", 409);
  }

  const effectiveServiceStatus = nextStatus || current.status;
  const automaticCourierStatus = current.courier
    ? courierStatusAfterService(current.courier.status as CourierStatus, effectiveServiceStatus)
    : undefined;
  const nextCourierStatus = parsed.data.courierStatus ||
    (automaticCourierStatus !== current.courier?.status ? automaticCourierStatus : undefined);
  if (parsed.data.courierStatus && ["cancelled", "rejected", "no_show"].includes(effectiveServiceStatus) &&
      parsed.data.courierStatus !== automaticCourierStatus) {
    return fail("برای خدمت لغوشده یا ردشده نمی‌توان ارسال جدید ثبت کرد.", 409);
  }
  if (nextStatus === "confirmed" && current.status === "completed" &&
      ["returning", "delivered"].includes(current.courier?.status)) {
    return fail("پس از تحویل دستگاه به پیک، بازگشایی خدمت مجاز نیست.", 409);
  }
  if (nextCourierStatus) {
    if (current.fulfillment !== "courier" || !current.courier) {
      return fail("این نوبت فاقد پیک است و نمی‌توان وضعیت پیک را تغییر داد.", 422);
    }
    const currentCourierStatus = (effectiveServiceStatus === "completed" ? automaticCourierStatus : current.courier.status || "pending") as CourierStatus;
    if (parsed.data.courierStatus && !canCourierTransition(currentCourierStatus, nextCourierStatus as CourierStatus)) {
      return fail("این انتقال وضعیت پیک مجاز نیست.", 409);
    }
    if (
      ["return_ready", "returning", "delivered"].includes(nextCourierStatus) &&
      effectiveServiceStatus !== "completed"
    ) {
      return fail("ارسال برگشت فقط پس از تکمیل و ثبت نهایی خدمت مجاز است.", 409);
    }
  }

  if (nextCourierStatus === "assigned" &&
      (effectiveServiceStatus !== "confirmed" || !current.pricing?.known)) {
    return fail("ابتدا درخواست را تأیید و مبلغ اولیه خدمت را ثبت کنید.", 409);
  }
  if (nextStatus === "completed" && (!current.storeOrderRegisteredAt || (isCourier && current.courier?.status !== "at_store"))) {
    return fail("ابتدا دریافت دستگاه و ثبت سفارش دستی را انجام دهید.", 409);
  }
  if (registerStoreOrder && !current.pricing?.known && parsed.data.baseAmount === undefined) {
    return fail("مبلغ خدمت را وارد کنید.", 422);
  }
  if (parsed.data.baseAmount !== undefined && current.status === "completed" && nextStatus !== "confirmed") {
    return fail("برای تغییر مبلغ، ابتدا سفارش را بازگشایی کنید.", 409);
  }

  const correctingCompletion = current.status === "completed" && nextStatus === "confirmed";
  if (correctingCompletion && current.storeOrderDeliveredAt) {
    return fail("سفارش تحویل داده شده است.", 409);
  }
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
  if (storeOrderCustomerId) {
    const customer = await Customer.exists({ _id: storeOrderCustomerId, mobile: current.phone });
    if (!customer) return fail("شماره مشتری سفارش با شماره ثبت‌شده در سایت مطابقت ندارد.", 422);
    set.storeOrderCustomer = storeOrderCustomerId;
  }
  if (storeOrderDescription !== undefined) set.description = storeOrderDescription;
  let gamesChanged = false;
  if (selectedGames) {
    const platforms = installationPlatforms(current.device, current.installationType);
    const docs = await GameList.find({ platform: { $in: catalogPlatformAliases(platforms) } })
      .select("platform items._id items.name items.size items.imageUrl items.imageAlt").lean() as GameCatalogDocument[];
    const previous = (current.selectedGames || []) as InstallationGame[];
    const catalog = installationCatalog(docs, platforms);
    const byKey = new Map([...catalog, ...previous.filter((game) => platforms.includes(game.platform))]
      .map((game) => [gameKey(game), game]));
    try {
      const games = resolveInstallationGames(selectedGames, [...byKey.values()]);
      gamesChanged = games.length !== previous.length || games.some((game, index) =>
        !previous[index] || gameKey(game) !== gameKey(previous[index]),
      );
      if (gamesChanged) {
        set.selectedGames = games;
        set.totalSizeGB = installationSize(games).totalSizeGB;
      }
    } catch (error) {
      return fail((error as Error).message, 422);
    }
  }

  if (registerStoreOrder && !current.storeOrderRegisteredAt) {
    set.storeOrderRegisteredAt = new Date();
  }

  // Handle courier status transition timestamps
  if (nextCourierStatus && current.courier) {
    set["courier.status"] = nextCourierStatus;
    if (nextCourierStatus === "pending") set["courier.returnReadyAt"] = null;
    const now = new Date();
    if (nextCourierStatus === "at_store" && !current.courier.arrivedAtStoreAt) {
      set["courier.arrivedAtStoreAt"] = now;
    }
    if (nextCourierStatus === "return_ready" && !current.courier.returnReadyAt) {
      set["courier.returnReadyAt"] = now;
    }
    if (nextCourierStatus === "returning" && !current.courier.returnStartedAt) {
      set["courier.returnStartedAt"] = now;
    }
    if (nextCourierStatus === "delivered" && !current.courier.deliveredAt) {
      set["courier.deliveredAt"] = now;
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

  if (gamesChanged || set.storeOrderRegisteredAt) {
    historyEntries.push({
      from: current.status,
      to: current.status,
      actorType: "admin",
      actor: auth.userId,
      note: [
        gamesChanged ? "فهرست بازی‌ها ویرایش شد" : "",
        set.storeOrderRegisteredAt ? "سفارش در ثبت دستی ثبت شد" : "",
      ].filter(Boolean).join(" · "),
      at: new Date(),
    });
  }

  if (historyEntries.length > 0) {
    update.$push = {
      history: { $each: historyEntries },
    };
  }

  const updateFilter: Record<string, unknown> = { _id: current._id, status: current.status };
  updateFilter["payment.status"] = !current.payment?.status || current.payment.status === "unpaid" ? { $in: ["unpaid", null] } : current.payment.status;
  if (current.courier) {
    updateFilter["courier.status"] = current.courier?.status || "pending";
  }
  if (current.updatedAt) updateFilter.updatedAt = current.updatedAt;
  if (!Object.keys(set).length && parsed.data.baseAmount === undefined) return ok(current);

  const persist = async (dbSession?: ClientSession) => {
    // Pricing calculation
    if (parsed.data.baseAmount !== undefined) {
      const serviceBaseAmount = Math.round(parsed.data.baseAmount);
      const shippingBaseAmount =
        current.pricing?.shippingBaseAmount ?? (current.courier?.totalShippingCost || 0);
      const deliveryCity = current.courier?.addressSnapshot?.city || "";

      const applied = nextStatus === "completed" ? await redeemVisitReward(
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
        dbSession,
      ) : { discount: 0, shippingDiscount: current.pricing?.shippingDiscountAmount || 0 };

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

    return Appointment.findOneAndUpdate(
      updateFilter,
      update,
      { returnDocument: "after", runValidators: true, session: dbSession },
    );
  };

  const conflict = new Error("Appointment changed");
  const updated = nextStatus === "completed" && current.selectedReward
    ? await mongoose.connection.transaction(async (session) => {
        const result = await persist(session);
        if (!result) throw conflict;
        return result;
      }).catch((error) => {
        if (error === conflict) return null;
        throw error;
      })
    : await persist();
  if (!updated) return fail("وضعیت نوبت هم‌زمان تغییر کرده است.", 409);

  let gamesNotificationStatus: "sent" | "failed" | undefined;
  if (gamesChanged) {
    gamesNotificationStatus = await notifyUser({
      userId: current.user,
      title: "بازی‌های سفارش شما به‌روزرسانی شد",
      message: `فهرست بازی‌های درخواست ${current.trackingCode} تغییر کرد. برای مشاهده بازی‌ها و مبلغ سفارش، جزئیات درخواست را باز کنید.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: `/my-profile?step=5&ordersTab=games#appointment-${current._id}`,
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `APPOINTMENT_GAMES:${current._id}:${new Date(updated.updatedAt).toISOString()}`,
    }).then(() => "sent" as const).catch(() => "failed" as const);
  }

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

  if (nextCourierStatus && nextCourierStatus !== current.courier?.status) {
    await notifyAdmins({
      title: "وضعیت پیک تغییر کرد",
      message: `پیک درخواست ${current.trackingCode}: ${courierLabels[nextCourierStatus]}`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: "/dashboard/appointments?fulfillment=courier",
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `ADMIN_COURIER_STATUS:${current._id}:${nextCourierStatus}`,
    }).catch((error) => console.error("[appointments] admin courier notification failed", error));
  }

  // User notifications
  if (nextStatus && nextStatus !== current.status) {
    await notifyUser({
      userId: current.user,
      title: "وضعیت نوبت تغییر کرد",
      message: nextStatus === "completed"
        ? `خدمات درخواست ${current.trackingCode} پایان یافت. مبلغ نهایی: ${updated.pricing.finalAmount.toLocaleString("fa-IR")} تومان. برای مشاهده و پرداخت روی اعلان بزنید.`
        : `وضعیت نوبت ${current.trackingCode} به «${labels[nextStatus]}» تغییر کرد.`,
      type: "REQUEST_STATUS_CHANGED",
      category: "request",
      entityType: "Appointment",
      entityId: current._id,
      link: `/my-profile?step=5&ordersTab=games#appointment-${current._id}`,
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
      link: `/my-profile?step=5&ordersTab=games#appointment-${current._id}`,
      senderType: "admin",
      senderId: auth.userId,
      eventKey: `COURIER_STATUS:${current._id}:${nextCourierStatus}`,
    }).catch(() => {});

    if (["return_ready", "returning", "delivered"].includes(nextCourierStatus)) {
      const bodyIdByStatus: Record<string, number | undefined> = {
        return_ready: Number(process.env.APPOINTMENT_SMS_RETURN_READY_BODY_ID) || undefined,
        returning: Number(process.env.APPOINTMENT_SMS_HANDED_TO_COURIER_BODY_ID) || undefined,
        delivered: Number(process.env.APPOINTMENT_SMS_DELIVERED_BODY_ID) || undefined,
      };
      await deliverBusinessSms({
        eventKey: `APPOINTMENT_COURIER:${current._id}:${nextCourierStatus}`,
        eventType: `APPOINTMENT_COURIER_${nextCourierStatus.toUpperCase()}`,
        entityType: "Appointment",
        entityId: current._id.toString(),
        bodyId: bodyIdByStatus[nextCourierStatus],
        to: current.phone,
        args: [current.trackingCode],
      }).catch(() => null);
    }
  }

  return ok(gamesNotificationStatus ? { ...updated.toObject(), gamesNotificationStatus } : updated);
}
