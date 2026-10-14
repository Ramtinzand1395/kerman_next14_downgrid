import Order from "@/model/Order";
import StoreOrder from "@/model/StoreOrder";
import Appointment from "@/model/Appointment";
import Product from "@/model/Product";
import User from "@/model/User";
import VisitReward from "@/model/VisitReward";
import Referral from "@/model/Loyalty Club/Referral";
import WalletTransaction from "@/model/Loyalty Club/WalletTransaction";
import {
  REPORT_TIME_ZONE,
  ReportRange,
  bucketIndexForDate,
  previousReportRange,
  resolveReportRange,
  safePercentChange,
  tehranDateTimeToUtc,
} from "@/lib/dashboard-date-range";

type AggregateRow = {
  _id: string | null;
  count?: number;
  amount?: number;
  estimatedAmount?: number;
  estimatedCount?: number;
};

export type ReportPoint = {
  key: string;
  label: string;
  startInclusive: string;
  endExclusive: string;
  grossPaidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
  paidOrders: number;
  estimatedPaidOrders: number;
  ordersCreated: number;
  manualOrdersAmount: number;
  manualOrdersCount: number;
  gameInstallAppointments: number;
  repairAppointments: number;
};

function dateFormat(range: ReportRange) {
  return range.granularity === "hour" ? "%Y-%m-%dT%H" : "%Y-%m-%d";
}

function dateGroupExpression(date: string, range: ReportRange) {
  return {
    $dateToString: {
      format: dateFormat(range),
      date,
      timezone: REPORT_TIME_ZONE,
    },
  };
}

function aggregateKeyToDate(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?$/.exec(key);
  if (!match) return null;
  return tehranDateTimeToUtc({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
  });
}

export function createEmptyReportPoints(range: ReportRange): ReportPoint[] {
  return range.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    startInclusive: bucket.startInclusive.toISOString(),
    endExclusive: bucket.endExclusive.toISOString(),
    grossPaidAmount: 0,
    refundedAmount: 0,
    netPaidAmount: 0,
    paidOrders: 0,
    estimatedPaidOrders: 0,
    ordersCreated: 0,
    manualOrdersAmount: 0,
    manualOrdersCount: 0,
    gameInstallAppointments: 0,
    repairAppointments: 0,
  }));
}

function mergeRowsIntoPoints(
  points: ReportPoint[],
  range: ReportRange,
  rows: AggregateRow[],
  merge: (point: ReportPoint, row: AggregateRow) => void,
) {
  for (const row of rows) {
    if (!row._id) continue;
    const at = aggregateKeyToDate(row._id);
    if (!at) continue;
    const index = bucketIndexForDate(at, range.buckets);
    if (index >= 0) merge(points[index], row);
  }
}

function paidDateFilter(range: ReportRange) {
  const exact = {
    paymentVerifiedAt: {
      $gte: range.startInclusive,
      $lt: range.endExclusive,
    },
  };
  const legacy = {
    paymentVerifiedAt: null,
    createdAt: {
      $gte: range.startInclusive,
      $lt: range.endExclusive,
    },
  };
  return { paymentStatus: "paid", $or: [exact, legacy] };
}

async function paidOrdersByBucket(range: ReportRange) {
  return Order.aggregate<AggregateRow>([
    { $match: paidDateFilter(range) },
    { $set: { effectivePaidAt: { $ifNull: ["$paymentVerifiedAt", "$createdAt"] } } },
    {
      $group: {
        _id: dateGroupExpression("$effectivePaidAt", range),
        amount: { $sum: "$finalPrice" },
        count: { $sum: 1 },
        estimatedAmount: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$paymentVerifiedAt", null] }, null] }, "$finalPrice", 0] },
        },
        estimatedCount: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$paymentVerifiedAt", null] }, null] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function orderCountByBucket(range: ReportRange) {
  return Order.aggregate<AggregateRow>([
    { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
    { $group: { _id: dateGroupExpression("$createdAt", range), count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
}

async function refundsByBucket(range: ReportRange) {
  return WalletTransaction.aggregate<AggregateRow>([
    {
      $match: {
        type: "refund",
        status: "completed",
        "ref.kind": "Order",
        createdAt: { $gte: range.startInclusive, $lt: range.endExclusive },
      },
    },
    { $group: { _id: dateGroupExpression("$createdAt", range), amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
}

async function commerceTotals(range: ReportRange) {
  const [paid, refunded, created] = await Promise.all([
    Order.aggregate([
      { $match: paidDateFilter(range) },
      {
        $group: {
          _id: null,
          amount: { $sum: "$finalPrice" },
          count: { $sum: 1 },
          estimatedAmount: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$paymentVerifiedAt", null] }, null] }, "$finalPrice", 0] } },
          estimatedCount: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$paymentVerifiedAt", null] }, null] }, 1, 0] } },
        },
      },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          type: "refund",
          status: "completed",
          "ref.kind": "Order",
          createdAt: { $gte: range.startInclusive, $lt: range.endExclusive },
        },
      },
      { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } }),
  ]);
  const grossPaidAmount = Number(paid[0]?.amount || 0);
  const refundedAmount = Number(refunded[0]?.amount || 0);
  return {
    grossPaidAmount,
    refundedAmount,
    netPaidAmount: grossPaidAmount - refundedAmount,
    paidOrders: Number(paid[0]?.count || 0),
    estimatedPaidAmount: Number(paid[0]?.estimatedAmount || 0),
    estimatedPaidOrders: Number(paid[0]?.estimatedCount || 0),
    completedRefunds: Number(refunded[0]?.count || 0),
    ordersCreated: created,
  };
}

export async function loadCommerceSection(range: ReportRange) {
  const previous = previousReportRange(range);
  const [paidRows, refundRows, orderRows, totals, previousTotals, orderStatus, paymentStatus] = await Promise.all([
    paidOrdersByBucket(range),
    refundsByBucket(range),
    orderCountByBucket(range),
    commerceTotals(range),
    commerceTotals(previous),
    Order.aggregate([
      { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      { $group: { _id: { $ifNull: ["$paymentStatus", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const points = createEmptyReportPoints(range);
  mergeRowsIntoPoints(points, range, paidRows, (point, row) => {
    point.grossPaidAmount += Number(row.amount || 0);
    point.paidOrders += Number(row.count || 0);
    point.estimatedPaidOrders += Number(row.estimatedCount || 0);
  });
  mergeRowsIntoPoints(points, range, refundRows, (point, row) => {
    point.refundedAmount += Number(row.amount || 0);
  });
  mergeRowsIntoPoints(points, range, orderRows, (point, row) => {
    point.ordersCreated += Number(row.count || 0);
  });
  for (const point of points) point.netPaidAmount = point.grossPaidAmount - point.refundedAmount;
  const chartTotals = points.reduce(
    (sum, point) => ({
      grossPaidAmount: sum.grossPaidAmount + point.grossPaidAmount,
      refundedAmount: sum.refundedAmount + point.refundedAmount,
      netPaidAmount: sum.netPaidAmount + point.netPaidAmount,
      paidOrders: sum.paidOrders + point.paidOrders,
      ordersCreated: sum.ordersCreated + point.ordersCreated,
    }),
    { grossPaidAmount: 0, refundedAmount: 0, netPaidAmount: 0, paidOrders: 0, ordersCreated: 0 },
  );

  return {
    points,
    totals: {
      ...totals,
      ...chartTotals,
      netPaidChangePercent: safePercentChange(chartTotals.netPaidAmount, previousTotals.netPaidAmount),
      ordersCreatedChangePercent: safePercentChange(chartTotals.ordersCreated, previousTotals.ordersCreated),
    },
    distributions: {
      orderStatus: orderStatus.map((item) => ({ key: String(item._id), count: Number(item.count) })),
      paymentStatus: paymentStatus.map((item) => ({ key: String(item._id), count: Number(item.count) })),
    },
    definitions: {
      grossPaidAmount: "Order.finalPrice برای paymentStatus=paid؛ شامل ارسال و پس از تخفیف، با تاریخ paymentVerifiedAt و fallback شفاف createdAt برای دادهٔ قدیمی.",
      refundedAmount: "فقط WalletTransaction نوع refund با status=completed و ref.kind=Order، بر اساس createdAt تراکنش.",
      pendingRefund: "pending_refund پرداخت یا بازپرداخت تکمیل‌شده محسوب نمی‌شود.",
      wallet: "خرید پرداخت‌شده با کیف پول در فروش لحاظ می‌شود؛ شارژ کیف پول Order نیست و در فروش وارد نمی‌شود.",
    },
  };
}

async function manualTotals(range: ReportRange) {
  const rows = await StoreOrder.aggregate([
    { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
    { $group: { _id: null, amount: { $sum: "$price" }, count: { $sum: 1 } } },
  ]);
  return { amount: Number(rows[0]?.amount || 0), count: Number(rows[0]?.count || 0) };
}

export async function loadManualOrdersSection(range: ReportRange) {
  const previous = previousReportRange(range);
  const [rows, previousTotals, deliveryStatus] = await Promise.all([
    StoreOrder.aggregate<AggregateRow>([
      { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      {
        $group: {
          _id: dateGroupExpression("$createdAt", range),
          amount: { $sum: "$price" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    manualTotals(previous),
    StoreOrder.aggregate([
      { $match: { createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      { $group: { _id: { $ifNull: ["$deliveryStatus", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const points = createEmptyReportPoints(range);
  mergeRowsIntoPoints(points, range, rows, (point, row) => {
    point.manualOrdersAmount += Number(row.amount || 0);
    point.manualOrdersCount += Number(row.count || 0);
  });
  const chartTotals = points.reduce(
    (sum, point) => ({
      amount: sum.amount + point.manualOrdersAmount,
      count: sum.count + point.manualOrdersCount,
    }),
    { amount: 0, count: 0 },
  );
  return {
    points,
    totals: {
      manualOrdersAmount: chartTotals.amount,
      manualOrdersCount: chartTotals.count,
      amountChangePercent: safePercentChange(chartTotals.amount, previousTotals.amount),
    },
    deliveryStatus: deliveryStatus.map((item) => ({ key: String(item._id), count: Number(item.count) })),
    definition: "StoreOrder.price بر اساس createdAt؛ چون مدل هیچ وضعیت تسویه یا سند پرداخت ندارد، این مبلغ درآمد وصول‌شده نیست.",
  };
}

export async function loadAppointmentsSection(range: ReportRange) {
  const [rows, status, courierStatus, pricing] = await Promise.all([
    Appointment.aggregate<AggregateRow & { serviceType?: string }>([
      { $match: { startsAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      {
        $group: {
          _id: {
            bucket: dateGroupExpression("$startsAt", range),
            serviceType: "$serviceType",
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: "$_id.bucket", serviceType: "$_id.serviceType", count: 1 } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      { $match: { startsAt: { $gte: range.startInclusive, $lt: range.endExclusive } } },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      {
        $match: {
          fulfillment: "courier",
          "courier.pickupDate": { $gte: range.startInclusive, $lt: range.endExclusive },
        },
      },
      { $group: { _id: { $ifNull: ["$courier.status", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: range.startInclusive, $lt: range.endExclusive },
        },
      },
      {
        $group: {
          _id: null,
          knownAmountCount: { $sum: { $cond: [{ $eq: ["$pricing.known", true] }, 1, 0] } },
          unknownAmountCount: { $sum: { $cond: [{ $eq: ["$pricing.known", true] }, 0, 1] } },
          documentedServiceAmount: {
            $sum: { $cond: [{ $eq: ["$pricing.known", true] }, { $ifNull: ["$pricing.serviceFinalAmount", 0] }, 0] },
          },
          serviceDiscountAmount: { $sum: { $ifNull: ["$pricing.serviceDiscountAmount", 0] } },
          shippingAmount: { $sum: { $ifNull: ["$pricing.shippingFinalAmount", 0] } },
        },
      },
    ]),
  ]);
  const points = createEmptyReportPoints(range);
  mergeRowsIntoPoints(points, range, rows, (point, row) => {
    const serviceType = (row as AggregateRow & { serviceType?: string }).serviceType;
    if (serviceType === "game_install") point.gameInstallAppointments += Number(row.count || 0);
    if (serviceType === "repair") point.repairAppointments += Number(row.count || 0);
  });
  const appointmentCount = points.reduce(
    (sum, point) => sum + point.gameInstallAppointments + point.repairAppointments,
    0,
  );
  return {
    points,
    totals: {
      appointmentCount,
      gameInstallAppointments: points.reduce((sum, point) => sum + point.gameInstallAppointments, 0),
      repairAppointments: points.reduce((sum, point) => sum + point.repairAppointments, 0),
      documentedServiceAmount: Number(pricing[0]?.documentedServiceAmount || 0),
      knownAmountCount: Number(pricing[0]?.knownAmountCount || 0),
      unknownAmountCount: Number(pricing[0]?.unknownAmountCount || 0),
      serviceDiscountAmount: Number(pricing[0]?.serviceDiscountAmount || 0),
      shippingAmount: Number(pricing[0]?.shippingAmount || 0),
    },
    distributions: {
      appointmentStatus: status.map((item) => ({ key: String(item._id), count: Number(item.count) })),
      courierStatus: courierStatus.map((item) => ({ key: String(item._id), count: Number(item.count) })),
    },
    definition: "تعداد نوبت بر اساس startsAt است. مبلغ خدمت فقط pricing.serviceFinalAmount نوبت تکمیل‌شده و دارای pricing.known=true است و به‌عنوان مبلغ ثبت‌شده، نه وجه دریافت‌شده، نمایش داده می‌شود؛ ارسال جداگانه گزارش می‌شود.",
  };
}

export async function loadOverviewSection(range: ReportRange) {
  const [totalUsers, totalProducts, inventory, usersCreated, productsCreated] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Product.aggregate([
      {
        $project: {
          units: {
            $cond: [
              { $eq: ["$productType", "multi"] },
              { $sum: { $map: { input: { $ifNull: ["$variants", []] }, as: "variant", in: { $ifNull: ["$$variant.stock", 0] } } } },
              { $ifNull: ["$stock", 0] },
            ],
          },
        },
      },
      { $group: { _id: null, units: { $sum: "$units" } } },
    ]),
    User.countDocuments({ createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } }),
    Product.countDocuments({ createdAt: { $gte: range.startInclusive, $lt: range.endExclusive } }),
  ]);
  return {
    totals: {
      totalUsers,
      totalProducts,
      totalInventoryUnits: Number(inventory[0]?.units || 0),
    },
    rangeCounts: { usersCreated, productsCreated },
    definitions: {
      totalInventoryUnits: "جمع Product.stock برای محصول تک‌مدلی و variants.stock برای محصول چندمدلی.",
      rangeCounts: "رکوردهای User و Product ایجادشده در بازه بر اساس createdAt.",
    },
  };
}

export async function loadOperationsSection(now = new Date()) {
  const today = resolveReportRange({ range: "today" }, now);
  const activeCourierStatuses = [
    "pending",
    "scheduled",
    "assigned",
    "picked_up",
    "at_store",
    "return_ready",
    "returning",
  ];
  const [appointmentsToday, pendingOrdersCount, pendingAppointmentsCount, courierQueueCount, upcomingAppointments, pendingOrders, courierQueue] = await Promise.all([
    Appointment.countDocuments({
      startsAt: { $gte: today.startInclusive, $lt: today.endExclusive },
      status: { $nin: ["cancelled", "rejected"] },
    }),
    Order.countDocuments({ paymentStatus: "paid", status: { $in: ["pending", "processing"] } }),
    Appointment.countDocuments({ status: "pending" }),
    Appointment.countDocuments({ fulfillment: "courier", "courier.status": { $in: activeCourierStatuses } }),
    Appointment.find({
      startsAt: { $gte: now, $lt: today.endExclusive },
      status: { $in: ["pending", "confirmed"] },
    })
      .select("trackingCode startsAt serviceType status customerName")
      .sort({ startsAt: 1 })
      .limit(5)
      .lean(),
    Order.find({ paymentStatus: "paid", status: { $in: ["pending", "processing"] } })
      .select("trackingCode invoiceNumber createdAt finalPrice status paymentGateway")
      .sort({ createdAt: 1 })
      .limit(5)
      .lean(),
    Appointment.find({ fulfillment: "courier", "courier.status": { $in: activeCourierStatuses } })
      .select("trackingCode customerName courier.pickupDate courier.status")
      .sort({ "courier.pickupDate": 1 })
      .limit(5)
      .lean(),
  ]);
  return {
    totals: {
      appointmentsToday,
      pendingOrdersCount,
      pendingAppointmentsCount,
      courierQueueCount,
      attentionRows: pendingOrdersCount + pendingAppointmentsCount + courierQueueCount,
    },
    upcomingAppointments: upcomingAppointments.map((item: any) => ({
      id: String(item._id),
      trackingCode: item.trackingCode,
      startsAt: item.startsAt.toISOString(),
      serviceType: item.serviceType,
      status: item.status,
      customerName: item.customerName,
      href: "/dashboard/appointments",
    })),
    pendingOrders: pendingOrders.map((item: any) => ({
      id: String(item._id),
      trackingCode: item.trackingCode || item.invoiceNumber || String(item._id).slice(-6),
      createdAt: item.createdAt.toISOString(),
      finalPrice: Number(item.finalPrice || 0),
      status: item.status,
      paymentGateway: item.paymentGateway || "unknown",
      href: "/dashboard/orders",
    })),
    courierQueue: courierQueue.map((item: any) => ({
      id: String(item._id),
      trackingCode: item.trackingCode,
      customerName: item.customerName,
      pickupDate: item.courier?.pickupDate?.toISOString() || null,
      status: item.courier?.status || "unknown",
      href: "/dashboard/appointments?tab=courier",
    })),
  };
}

export async function loadLoyaltySection(range: ReportRange) {
  const [members, availableVisitRewards, redeemedVisitRewards, rewardedReferrals] = await Promise.all([
    User.countDocuments({ vipTier: { $exists: true, $ne: null } }),
    VisitReward.countDocuments({ status: "available", expiresAt: { $gt: new Date() } }),
    VisitReward.countDocuments({
      status: "redeemed",
      redeemedAt: { $gte: range.startInclusive, $lt: range.endExclusive },
    }),
    Referral.countDocuments({
      status: "rewarded",
      rewardedAt: { $gte: range.startInclusive, $lt: range.endExclusive },
    }),
  ]);
  return {
    members,
    availableVisitRewards,
    redeemedVisitRewards,
    rewardedReferrals,
    href: "/dashboard/loyalty",
    definition: "اعضای VIP از User.vipTier، پاداش‌های مراجعه از VisitReward و دعوت‌های موفق از Referral.status=rewarded خوانده می‌شوند.",
  };
}

export function serializeReportMeta(range: ReportRange, generatedAt = new Date()) {
  return {
    range: range.key,
    timezone: REPORT_TIME_ZONE,
    startInclusive: range.startInclusive.toISOString(),
    endExclusive: range.endExclusive.toISOString(),
    startJalali: range.startJalali,
    endJalali: range.endJalali,
    granularity: range.granularity,
    durationDays: range.durationDays,
    generatedAt: generatedAt.toISOString(),
    amountUnit: "تومان",
    dateContract: "[startInclusive, endExclusive)",
  };
}
