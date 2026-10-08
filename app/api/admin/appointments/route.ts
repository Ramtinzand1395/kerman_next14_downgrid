import { requireAdmin, ok } from "@/lib/loyalty/api";
import Appointment from "@/model/Appointment";
import VisitReward from "@/model/VisitReward";
import VisitRewardRule from "@/model/VisitRewardRule";
import { formatRewardDescription } from "@/lib/appointments/policy";
import { tehranDateKey } from "@/lib/appointments/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));

  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  const serviceType = url.searchParams.get("serviceType");
  const fulfillment = url.searchParams.get("fulfillment");
  const courierStatus = url.searchParams.get("courierStatus");
  const rewardStatus = url.searchParams.get("rewardStatus");
  const date = url.searchParams.get("date");
  const search = url.searchParams.get("search")?.trim();

  if (status) filter.status = status;
  if (serviceType) filter.serviceType = serviceType;
  if (fulfillment) filter.fulfillment = fulfillment;
  if (courierStatus) filter["courier.status"] = courierStatus;

  if (rewardStatus === "has_reward") {
    filter.selectedReward = { $ne: null };
  } else if (rewardStatus === "no_reward") {
    filter.selectedReward = null;
  }

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    filter.startsAt = {
      $gte: new Date(`${date}T00:00:00+03:30`),
      $lt: new Date(`${date}T23:59:59.999+03:30`),
    };
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { customerName: regex },
      { phone: regex },
      { trackingCode: regex },
    ];
  }

  const [rawItems, total] = await Promise.all([
    Appointment.find(filter)
      .populate("user", "username mobile")
      .populate("selectedReward")
      .sort({ startsAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  const userIds = Array.from(
    new Set(
      rawItems
        .map((i) => {
          const u = i.user as { _id?: unknown } | string | null;
          return u && typeof u === "object" && u._id ? String(u._id) : u ? String(u) : "";
        })
        .filter(Boolean),
    ),
  );

  const now = new Date();
  const [completedVisits, activeRules, userRewards] = await Promise.all([
    Appointment.find({
      user: { $in: userIds },
      status: "completed",
      visitCountedAt: { $ne: null },
    })
      .select("user serviceType completedAt")
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
    VisitReward.find({
      user: { $in: userIds },
      status: "available",
      expiresAt: { $gt: now },
    }).lean(),
  ]);

  const items = rawItems.map((item) => {
    const userId = item.user && typeof item.user === "object" && (item.user as { _id?: unknown })._id
      ? String((item.user as { _id?: unknown })._id)
      : String(item.user || "");

    const userVisits = completedVisits.filter((v) => String(v.user) === userId);
    const lastVisit = userVisits
      .map((v) => v.completedAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    const customerSummary = {
      totalCompletedVisits: userVisits.length,
      gameInstallVisits: userVisits.filter((v) => v.serviceType === "game_install").length,
      repairVisits: userVisits.filter((v) => v.serviceType === "repair").length,
      lastCompletedVisitAt: lastVisit,
    };

    const progress = activeRules.map((rule) => {
      const count = userVisits.filter((v) => rule.eligibleServices.includes(v.serviceType)).length;
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
        rewardDescription: formatRewardDescription(rule.reward),
      };
    });

    const available = userRewards
      .filter((r) => String(r.user) === userId)
      .map((r) => {
        const snap = r.snapshot as { reward?: Parameters<typeof formatRewardDescription>[0] } | undefined;
        return {
          ...r,
          rewardDescription: snap?.reward ? formatRewardDescription(snap.reward) : "",
        };
      });

    let selectedRewardFormatted: Record<string, unknown> | null = null;
    if (item.selectedReward && typeof item.selectedReward === "object") {
      const sr = item.selectedReward as { snapshot?: { reward?: Parameters<typeof formatRewardDescription>[0] } };
      selectedRewardFormatted = {
        ...item.selectedReward,
        rewardDescription: sr.snapshot?.reward ? formatRewardDescription(sr.snapshot.reward) : "",
      };
    }

    const rewardSummary = {
      selectedReward: selectedRewardFormatted,
      availableRewards: available,
      progress,
    };

    let courierSummary: Record<string, unknown> | null = null;
    if (item.fulfillment === "courier" && item.courier) {
      courierSummary = {
        status: item.courier.status,
        pickupDate: item.courier.pickupDate,
        pickupWindow: item.courier.pickupWindow,
        regionTitle: item.courier.regionTitle || "",
        shippingBaseAmount: item.pricing?.shippingBaseAmount ?? item.courier.totalShippingCost,
        shippingDiscountAmount: item.pricing?.shippingDiscountAmount ?? item.courier.freeShippingDiscount,
        shippingFinalAmount: item.pricing?.shippingFinalAmount ?? item.courier.finalShippingCost,
        address: {
          recipientName: item.courier.addressSnapshot?.recipientName || item.customerName,
          recipientPhone: item.courier.addressSnapshot?.recipientPhone || item.phone,
          city: item.courier.addressSnapshot?.city || "",
          address: item.courier.addressSnapshot?.address || "",
        },
      };
    }

    return {
      ...item,
      customerSummary,
      rewardSummary,
      courierSummary,
    };
  });

  // Calculate today summary
  const todayKey = tehranDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00+03:30`);
  const todayEnd = new Date(`${todayKey}T23:59:59.999+03:30`);

  const todayAppointments = await Appointment.find({
    startsAt: { $gte: todayStart, $lte: todayEnd },
  })
    .select("status fulfillment courier.status selectedReward")
    .lean();

  const todaySummary = {
    total: todayAppointments.length,
    pending: todayAppointments.filter((a) => a.status === "pending").length,
    confirmed: todayAppointments.filter((a) => a.status === "confirmed").length,
    completed: todayAppointments.filter((a) => a.status === "completed").length,
    noShow: todayAppointments.filter((a) => a.status === "no_show").length,
    inStore: todayAppointments.filter((a) => a.fulfillment === "in_store").length,
    courier: todayAppointments.filter((a) => a.fulfillment === "courier").length,
    courierPickups: todayAppointments.filter(
      (a) => a.fulfillment === "courier" && ["picked_up", "at_store"].includes(a.courier?.status),
    ).length,
    courierReturns: todayAppointments.filter(
      (a) => a.fulfillment === "courier" && ["returning", "delivered"].includes(a.courier?.status),
    ).length,
    rewardsRedeemed: todayAppointments.filter(
      (a) => a.selectedReward && a.status === "completed",
    ).length,
  };

  return ok({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    today: todaySummary,
  });
}

