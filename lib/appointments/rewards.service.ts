import Appointment from "@/model/Appointment";
import VisitReward from "@/model/VisitReward";
import VisitRewardRule from "@/model/VisitRewardRule";
import {
  computeRewardDiscount,
  formatRewardDescription,
  FulfillmentType,
  ServiceType,
} from "./policy";

export async function getVisitRewardSummary(userId: string) {
  const now = new Date();
  await VisitReward.updateMany(
    { user: userId, status: "available", expiresAt: { $lt: now } },
    { $set: { status: "expired" } },
  );
  const [completed, rules, rewards] = await Promise.all([
    Appointment.find({ user: userId, status: "completed", visitCountedAt: { $ne: null } })
      .select("serviceType")
      .lean(),
    VisitRewardRule.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ requiredVisits: 1 })
      .lean(),
    VisitReward.find({ user: userId }).sort({ createdAt: -1 }).lean(),
  ]);
  const progress = rules.map((rule) => {
    const count = completed.filter((item) =>
      rule.eligibleServices.includes(item.serviceType),
    ).length;
    const cycle =
      rule.recurrence === "repeat"
        ? count % rule.requiredVisits
        : Math.min(count, rule.requiredVisits);
    return {
      ruleId: String(rule._id),
      title: rule.title,
      completedVisits: count,
      requiredVisits: rule.requiredVisits,
      remaining:
        count >= rule.requiredVisits && rule.recurrence === "once"
          ? 0
          : rule.requiredVisits - cycle,
      recurrence: rule.recurrence,
      willEarnOnCompletion:
        rule.recurrence === "repeat"
          ? (count + 1) % rule.requiredVisits === 0
          : count + 1 === rule.requiredVisits,
      reward: rule.reward,
      rewardDescription: formatRewardDescription(rule.reward),
    };
  });
  const formattedRewards = rewards.map((r) => {
    const snap = r.snapshot as { reward?: Parameters<typeof formatRewardDescription>[0] } | undefined;
    return {
      ...r,
      rewardDescription: snap?.reward ? formatRewardDescription(snap.reward) : "",
    };
  });
  return { validVisits: completed.length, progress, rewards: formattedRewards };
}

export async function issueVisitRewards(appointmentId: string) {
  const appointment = await Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      status: "completed",
      visitCountedAt: null,
      rewardProcessingState: { $ne: "processing" },
    },
    { $set: { visitCountedAt: new Date(), rewardProcessingState: "processing" } },
    { returnDocument: "after" },
  );
  if (!appointment) {
    const existing = await Appointment.findById(appointmentId)
      .select("status rewardProcessingState")
      .lean();
    return { processed: existing?.rewardProcessingState === "done", duplicate: true };
  }
  try {
    const now = new Date();
    const rules = await VisitRewardRule.find({
      isActive: true,
      eligibleServices: appointment.serviceType,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    }).lean();
    for (const rule of rules) {
      const count = await Appointment.countDocuments({
        user: appointment.user,
        serviceType: { $in: rule.eligibleServices },
        status: "completed",
        visitCountedAt: { $ne: null },
      });
      if (count < rule.requiredVisits) continue;
      const milestone =
        rule.recurrence === "repeat"
          ? Math.floor(count / rule.requiredVisits)
          : 1;
      if (rule.recurrence === "repeat" && count % rule.requiredVisits !== 0) continue;
      const expiresAt = new Date(now.getTime() + rule.reward.validityDays * 86400_000);
      await VisitReward.updateOne(
        { user: appointment.user, rule: rule._id, milestone },
        {
          $setOnInsert: {
            user: appointment.user,
            rule: rule._id,
            milestone,
            ruleVersion: rule.version,
            snapshot: {
              title: rule.title,
              eligibleServices: rule.eligibleServices,
              reward: rule.reward,
            },
            status: "available",
            expiresAt,
            sourceAppointment: appointment._id,
          },
        },
        { upsert: true },
      );
    }
    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { rewardProcessingState: "done" } },
    );
    return { processed: true };
  } catch (error) {
    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { rewardProcessingState: "failed" }, $unset: { visitCountedAt: 1 } },
    );
    throw error;
  }
}

export async function reserveVisitReward(
  userId: string,
  rewardId: string,
  appointmentId: string,
  serviceType: ServiceType,
  device: string,
  installationType?: string | null,
  fulfillment: FulfillmentType = "in_store",
  deliveryCity?: string,
) {
  const reward = await VisitReward.findOne({ _id: rewardId, user: userId }).lean();
  if (!reward || reward.status !== "available" || reward.expiresAt <= new Date()) return null;
  const snapshot = reward.snapshot as {
    eligibleServices?: ServiceType[];
    reward?: {
      type?: "fixed" | "percent" | "free_game" | "free_shipping";
      eligibleDevices?: string[];
      eligibleInstallationTypes?: string[];
      shippingRegion?: string;
    };
  };
  if (!snapshot.eligibleServices?.includes(serviceType)) return null;

  if (snapshot.reward?.type === "free_shipping") {
    if (fulfillment !== "courier") return null;
    if (
      snapshot.reward.shippingRegion &&
      (!deliveryCity ||
        deliveryCity.trim().toLowerCase() !== snapshot.reward.shippingRegion.trim().toLowerCase())
    ) {
      return null;
    }
  } else {
    if (
      snapshot.reward?.eligibleDevices?.length &&
      !snapshot.reward.eligibleDevices.includes(device)
    ) {
      return null;
    }
    if (
      snapshot.reward?.eligibleInstallationTypes?.length &&
      (!installationType ||
        !snapshot.reward.eligibleInstallationTypes.includes(installationType))
    ) {
      return null;
    }
  }

  return VisitReward.findOneAndUpdate(
    { _id: rewardId, user: userId, status: "available", expiresAt: { $gt: new Date() } },
    { $set: { status: "reserved", reservedFor: appointmentId, reservedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function releaseVisitReward(appointmentId: string) {
  await VisitReward.updateOne(
    { reservedFor: appointmentId, status: "reserved" },
    { $set: { status: "available", reservedFor: null, reservedAt: null } },
  );
}

export async function redeemVisitReward(
  appointment: {
    _id: unknown;
    user: unknown;
    serviceType: ServiceType;
    fulfillment?: FulfillmentType;
    selectedReward?: unknown;
  },
  serviceBaseAmount: number,
  shippingBaseAmount: number = 0,
  deliveryCity?: string,
) {
  if (!appointment.selectedReward) {
    return { discount: 0, shippingDiscount: 0, reward: null };
  }
  const reward = await VisitReward.findOne({
    _id: appointment.selectedReward,
    user: appointment.user,
    status: "reserved",
    reservedFor: appointment._id,
    expiresAt: { $gt: new Date() },
  });
  if (!reward) return { discount: 0, shippingDiscount: 0, reward: null };

  const details = (
    reward.snapshot as {
      reward: {
        type: "fixed" | "percent" | "free_game" | "free_shipping";
        value: number;
        maxDiscountAmount?: number;
        minAmount?: number;
        shippingRegion?: string;
        maxShippingCost?: number;
      };
    }
  ).reward;

  if (details.type === "free_shipping") {
    if (appointment.fulfillment !== "courier") {
      await releaseVisitReward(String(appointment._id));
      return { discount: 0, shippingDiscount: 0, reward: null };
    }
    if (
      details.shippingRegion &&
      (!deliveryCity ||
        deliveryCity.trim().toLowerCase() !== details.shippingRegion.trim().toLowerCase())
    ) {
      await releaseVisitReward(String(appointment._id));
      return { discount: 0, shippingDiscount: 0, reward: null };
    }
    const shippingDiscount =
      details.maxShippingCost && details.maxShippingCost > 0
        ? Math.min(shippingBaseAmount, Math.round(details.maxShippingCost))
        : shippingBaseAmount;

    await VisitReward.updateOne(
      { _id: reward._id, status: "reserved", reservedFor: appointment._id },
      { $set: { status: "redeemed", redeemedAt: new Date() } },
    );
    return { discount: 0, shippingDiscount, reward };
  }

  // Financial / service reward (fixed, percent, free_game)
  if (serviceBaseAmount < (details.minAmount ?? 0)) {
    // Condition not met -> release reward back to available!
    await releaseVisitReward(String(appointment._id));
    return { discount: 0, shippingDiscount: 0, reward: null };
  }

  const discount = computeRewardDiscount({
    ...details,
    baseAmount: serviceBaseAmount,
    serviceType: appointment.serviceType,
  });

  await VisitReward.updateOne(
    { _id: reward._id, status: "reserved", reservedFor: appointment._id },
    { $set: { status: "redeemed", redeemedAt: new Date() } },
  );
  return { discount, shippingDiscount: 0, reward };
}

