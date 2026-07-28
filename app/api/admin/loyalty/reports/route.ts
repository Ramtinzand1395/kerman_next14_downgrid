// app/api/admin/loyalty/reports/route.ts
// گزارش‌های مدیریتی باشگاه مشتریان:
// ?report=top-buyers | ltv | active-users | cashback | wallet-usage | vip | referral
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { ok, requireAdmin, fail } from "@/lib/loyalty/api";
import User from "@/model/User";
import WalletTransaction from "@/model/WalletTransaction";
import Referral from "@/model/Referral";
import Experience from "@/model/Experience";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const report = req.nextUrl.searchParams.get("report") ?? "top-buyers";
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20));

  switch (report) {
    // بیشترین خریداران
    case "top-buyers": {
      const items = await User.find({ role: "user", successfulOrders: { $gt: 0 } })
        .sort({ totalPurchase: -1 })
        .limit(limit)
        .select("username mobile totalPurchase successfulOrders vipTier")
        .lean();
      return ok(items);
    }

    // ارزش طول عمر مشتری — میانگین و توزیع
    case "ltv": {
      const [agg] = await User.aggregate<{
        avgLtv: number; totalLtv: number; buyers: number; totalUsers: number;
      }>([
        {
          $group: {
            _id: null,
            totalLtv: { $sum: "$totalPurchase" },
            buyers: { $sum: { $cond: [{ $gt: ["$successfulOrders", 0] }, 1, 0] } },
            totalUsers: { $sum: 1 },
          },
        },
        { $addFields: { avgLtv: { $cond: [{ $gt: ["$buyers", 0] }, { $divide: ["$totalLtv", "$buyers"] }, 0] } } },
      ]);
      return ok(agg ?? { avgLtv: 0, totalLtv: 0, buyers: 0, totalUsers: 0 });
    }

    // کاربران فعال (بر اساس XP ماه جاری)
    case "active-users": {
      const items = await Experience.find({ monthlyXp: { $gt: 0 } })
        .sort({ monthlyXp: -1 })
        .limit(limit)
        .populate("user", "username mobile")
        .lean();
      const totalActive = await Experience.countDocuments({ monthlyXp: { $gt: 0 } });
      return ok({ items, totalActive });
    }

    // مجموع کش‌بک پرداخت‌شده
    case "cashback": {
      const [agg] = await WalletTransaction.aggregate<{ total: number; count: number }>([
        { $match: { type: "cashback", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      const monthly = await WalletTransaction.aggregate<{ _id: string; total: number }>([
        { $match: { type: "cashback", status: "completed" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]);
      return ok({ total: agg?.total ?? 0, count: agg?.count ?? 0, monthly });
    }

    // میزان استفاده از کیف پول
    case "wallet-usage": {
      const agg = await WalletTransaction.aggregate<{ _id: string; total: number; count: number }>([
        { $match: { status: "completed" } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      return ok(agg);
    }

    // تعداد کاربران VIP به تفکیک سطح
    case "vip": {
      const agg = await User.aggregate<{ _id: string; count: number }>([
        { $match: { vipTier: { $exists: true, $ne: null } } },
        { $group: { _id: "$vipTier", count: { $sum: 1 } } },
      ]);
      return ok(agg);
    }

    // عملکرد سیستم معرفی دوستان
    case "referral": {
      const [totals] = await Referral.aggregate<{
        total: number; rewarded: number; totalPaid: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            rewarded: { $sum: { $cond: [{ $eq: ["$status", "rewarded"] }, 1, 0] } },
            totalPaid: { $sum: { $cond: [{ $eq: ["$status", "rewarded"] }, "$referrerReward", 0] } },
          },
        },
      ]);
      const topReferrers = await Referral.aggregate<{
        _id: mongoose.Types.ObjectId; count: number; earned: number;
      }>([
        { $match: { status: "rewarded" } },
        { $group: { _id: "$referrer", count: { $sum: 1 }, earned: { $sum: "$referrerReward" } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { username: 1, mobile: 1 } }],
          },
        },
        { $unwind: "$user" },
      ]);
      return ok({ ...(totals ?? { total: 0, rewarded: 0, totalPaid: 0 }), topReferrers });
    }

    default:
      return fail("نوع گزارش نامعتبر است", 400);
  }
}
