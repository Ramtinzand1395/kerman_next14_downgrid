import mongoose from "mongoose";
import PointsTransaction from "@/model/PointsTransaction";
import User from "@/model/User";
import Referral from "@/model/Referral";
import Order from "@/model/Order";
import { getRules } from "@/lib/loyaltyRules";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function pointsToToman(points: number) {
  // طبق تبدیل شما: هر 100 امتیاز = 10,000 تومان => هر 1 امتیاز = 100 تومان
  return points * 100;
}

export async function getAvailablePoints(userId: string) {
  const now = new Date();
  const uid = new mongoose.Types.ObjectId(userId);

  const res = await PointsTransaction.aggregate([
    {
      $match: {
        user: uid,
        status: "CONFIRMED",
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      },
    },
    { $group: { _id: null, sum: { $sum: "$points" } } },
  ]);

  return res?.[0]?.sum ?? 0;
}

export async function calcEarnPointsForOrder(finalPriceToman: number) {
  const rules = await getRules();
  return Math.floor(finalPriceToman / 100000) * rules.orderEarnPer100k;
}

export async function calcEarnPointsForRepair(priceToman: number) {
  const rules = await getRules();
  return Math.floor(priceToman / 100000) * rules.repairEarnPer100k;
}

export async function createPendingEarnForOrder(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.user) throw new Error("ORDER_HAS_NO_USER");
  if (order.paymentStatus !== "paid") throw new Error("ORDER_NOT_PAID");

  const points = await calcEarnPointsForOrder(Number(order.finalPrice ?? 0));
  if (points <= 0) return;

  const rules = await getRules();
  const now = new Date();
  const expiresAt = addMonths(now, rules.expireMonths);

  await PointsTransaction.create({
    user: order.user,
    kind: "EARN",
    status: "PENDING",
    points,
    source: "ORDER",
    sourceRefId: String(order._id),
    note: "Order paid - pending until delivered",
    availableAt: null,
    expiresAt,
  });
}

export async function confirmEarnForOrder(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.user) throw new Error("ORDER_HAS_NO_USER");
  if (order.status !== "delivered") throw new Error("ORDER_NOT_DELIVERED");

  const now = new Date();

  // confirm pending earn
  await PointsTransaction.updateOne(
    {
      user: order.user,
      source: "ORDER",
      sourceRefId: String(order._id),
      kind: "EARN",
      status: "PENDING",
    },
    { $set: { status: "CONFIRMED", availableAt: now } },
  );

  // referral rewards (only if first completion of referred user)
  await maybeRewardReferralForUser(
    String(order.user),
    "ORDER_DELIVERED",
    String(order._id),
  );
}



async function userHasAnyConfirmedEarn(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const doc = await PointsTransaction.findOne({
    user: uid,
    kind: "EARN",
    status: "CONFIRMED",
    source: { $in: ["ORDER", "REPAIR"] },
  }).lean();
  return !!doc;
}

// وقتی کاربر جدید referredBy دارد، فقط “اولین” تکمیل خرید/تعمیرش پاداش می‌دهد
export async function maybeRewardReferralForUser(
  referredUserId: string,
  triggerKind: "ORDER_DELIVERED" | "REPAIR_COMPLETED",
  triggerRefId: string,
) {
  const referredUser = await User.findById(referredUserId).lean();
  if (!referredUser?.referredBy) return;

  // اگر قبلاً reward شده، کاری نکن
  const alreadyRewarded = await Referral.findOne({
    referredUser: referredUser._id,
    status: "REWARDED",
  }).lean();
  if (alreadyRewarded) return;

  // فقط اولین completion: اگر قبل از این، امتیاز CONFIRMED داشته، دیگر پاداش نده
  // نکته: چون همین الان داریم confirm می‌کنیم، بهتره بررسی کنیم آیا قبل از این رویداد confirmed earn وجود داشته یا نه
  // ساده‌ترین: اگر قبلاً referral rewarded نشده، همین رویداد را reward کن (با یک guard اضافی)
  // Guard بهتر:
  const hadConfirmedBefore = await userHasAnyConfirmedEarn(referredUserId);
  // چون همین الان یک CONFIRMED ثبت شده، این true می‌شود. پس باید روش دقیق‌تر:
  // راه دقیق: چک کنیم آیا referral status USED هست و هنوز rewarded نشده + در trigger ثبت نشده.
  // نتیجه: ما از Referral doc استفاده می‌کنیم.

  const referrerId = String(referredUser.referredBy);

  // Referral doc را upsert کن
  const referrer = await User.findById(referrerId).lean();
  if (!referrer) return;

  const referral = await Referral.findOneAndUpdate(
    { code: referrer.referralCode, referrerUser: referrer._id },
    {
      $setOnInsert: {
        code: referrer.referralCode,
        referrerUser: referrer._id,
        status: "CREATED",
      },
    },
    { upsert: true, new: true },
  );

  // اگر referredUser قبلاً set نشده، set کن و status را USED کن
  if (!referral.referredUser) {
    referral.referredUser = referredUser._id;
    referral.status = "USED";
    referral.usedAt = new Date();
    await referral.save();
  }

  // اگر الان reward شد، دوباره reward نده
  if (referral.status === "REWARDED") return;

  // ✅ پاداش‌ها
  const rules = await getRules();
  const now = new Date();
  const expiresAt = addMonths(now, rules.expireMonths);

  // معرفی‌کننده: +50
  await PointsTransaction.create({
    user: referrer._id,
    kind: "EARN",
    status: "CONFIRMED",
    points: rules.referrerBonus,
    source: "REFERRAL",
    sourceRefId: String(referral._id),
    note: "Referral bonus (referrer)",
    availableAt: now,
    expiresAt,
  });

  // کاربر جدید: +20 خوش‌آمد
  await PointsTransaction.create({
    user: referredUser._id,
    kind: "EARN",
    status: "CONFIRMED",
    points: rules.referredWelcome,
    source: "REFERRAL",
    sourceRefId: String(referral._id),
    note: "Referral welcome (referred user)",
    availableAt: now,
    expiresAt,
  });

  referral.status = "REWARDED";
  referral.rewardedAt = now;
  referral.trigger = { kind: triggerKind, refId: triggerRefId };
  await referral.save();
}

export async function redeemPointsForOrder(params: {
  userId: string;
  orderId: string;
  requestedPoints: number;
}) {
  const { userId, orderId } = params;
  const order = await Order.findById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.user || String(order.user) !== userId)
    throw new Error("FORBIDDEN");
  if (order.paymentStatus === "paid") throw new Error("ORDER_ALREADY_PAID");

  const rules = await getRules();
  const available = await getAvailablePoints(userId);

  const requested = Math.max(0, Math.floor(params.requestedPoints || 0));
  const usable = Math.min(available, requested);

  // سقف 20% مبلغ سفارش
  const capToman = Math.floor(
    Number(order.finalPrice) * (rules.redeemCapPercent / 100),
  );
  const maxPointsByCap = Math.floor(capToman / 100); // چون 1 امتیاز = 100 تومان
  const pointsToSpend = Math.min(usable, maxPointsByCap);

  const discountToman = pointsToToman(pointsToSpend);

  // اگر صفر، هیچ کاری نکن
  if (pointsToSpend <= 0) {
    return { pointsToSpend: 0, discountToman: 0, available };
  }

  // SPEND را فعلاً PENDING می‌زنیم تا وقتی پرداخت موفق شد CONFIRMED کنیم
  await PointsTransaction.create({
    user: new mongoose.Types.ObjectId(userId),
    kind: "SPEND",
    status: "PENDING",
    points: -pointsToSpend,
    source: "ORDER",
    sourceRefId: String(order._id),
    note: "Spend points for order (pending until paid)",
    availableAt: null,
    expiresAt: null,
  });

  // روی سفارش ذخیره کن
  order.loyalty = {
    pointsSpent: pointsToSpend,
    discountFromPoints: discountToman,
  };

  // اگر می‌خوای قیمت نهایی را همانجا کم کنی (اختیاری):
  // order.finalPrice = Math.max(0, Number(order.finalPrice) - discountToman);

  await order.save();

  return { pointsToSpend, discountToman, available };
}

export async function confirmSpendForOrder(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order?.user) throw new Error("ORDER_NOT_FOUND");
  if (order.paymentStatus !== "paid") throw new Error("ORDER_NOT_PAID");

  const now = new Date();

  await PointsTransaction.updateOne(
    {
      user: order.user,
      kind: "SPEND",
      source: "ORDER",
      sourceRefId: String(order._id),
      status: "PENDING",
    },
    { $set: { status: "CONFIRMED", consumedAt: now, availableAt: now } },
  );
}

export async function cancelSpendForOrder(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order?.user) throw new Error("ORDER_NOT_FOUND");

  await PointsTransaction.updateOne(
    {
      user: order.user,
      kind: "SPEND",
      source: "ORDER",
      sourceRefId: String(order._id),
      status: "PENDING",
    },
    { $set: { status: "CANCELED" } },
  );
}
