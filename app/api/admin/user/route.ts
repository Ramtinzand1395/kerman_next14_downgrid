import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import User from "@/model/User";
import Address from "@/model/Address";
import Comment from "@/model/Comment";
import Favorite from "@/model/Favorite";
import Order from "@/model/Order";
import "@/model/Product";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const USER_ROLES = ["user", "admin", "superadmin"] as const;
// User loyalty counters can outlive an order. This report describes current,
// paid online orders, without changing historical loyalty/VIP entitlements.
const successfulOrderFilter = {
  paymentStatus: "paid",
  status: { $in: ["pending", "processing", "shipped", "delivered"] },
  user: { $type: "objectId" },
};

function positiveInteger(value: string | null, fallback: number, maximum?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = positiveInteger(searchParams.get("limit"), 12, 50);
  const query = searchParams.get("query")?.trim().slice(0, 100) ?? "";
  const requestedRole = searchParams.get("role");
  const role = USER_ROLES.find((item) => item === requestedRole);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (query) {
    const pattern = new RegExp(escapeRegex(query), "i");
    filter.$or = [
      { username: pattern },
      { mobile: pattern },
      { email: pattern },
    ];
  }

  const [userDocuments, total, summaryRows, totalComments, successfulOrders] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "username email mobile role createdAt updatedAt phoneVerifiedAt",
      )
      .lean(),
    User.countDocuments(filter),
    User.aggregate<{
      _id: null;
      totalUsers: number;
      regularUsers: number;
      admins: number;
      missingVerificationRecords: number;
    }>([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          regularUsers: {
            $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
          },
          admins: {
            $sum: {
              $cond: [{ $in: ["$role", ["admin", "superadmin"]] }, 1, 0],
            },
          },
          missingVerificationRecords: {
            $sum: { $cond: [{ $eq: [{ $type: "$phoneVerifiedAt" }, "date"] }, 0, 1] },
          },
        },
      },
    ]),
    Comment.countDocuments(),
    Order.countDocuments(successfulOrderFilter),
  ]);

  const userIds = userDocuments.map((user) => user._id);
  const [addressCounts, commentCounts, favorites, purchaseStats] = userIds.length
    ? await Promise.all([
        Address.aggregate<{ _id: string; count: number }>([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]),
        Comment.aggregate<{ _id: string; count: number }>([
          { $match: { user: { $in: userIds } } },
          { $group: { _id: "$user", count: { $sum: 1 } } },
        ]),
        Favorite.find({ userId: { $in: userIds } })
          .sort({ createdAt: -1 })
          .populate({ path: "productId", select: "title mainImage" })
          .lean(),
        Order.aggregate<{ _id: string; successfulOrders: number; totalPurchase: number }>([
          { $match: { ...successfulOrderFilter, user: { $in: userIds } } },
          {
            $group: {
              _id: "$user",
              successfulOrders: { $sum: 1 },
              totalPurchase: { $sum: "$finalPrice" },
            },
          },
        ]),
      ])
    : [[], [], [], []];

  const purchasesByUser = new Map(
    purchaseStats.map((item) => [String(item._id), item]),
  );

  const addressesByUser = new Map(
    addressCounts.map((item) => [String(item._id), item.count]),
  );
  const commentsByUser = new Map(
    commentCounts.map((item) => [String(item._id), item.count]),
  );
  const favoritesByUser = new Map<string, typeof favorites>();

  for (const favorite of favorites) {
    const userId = String(favorite.userId);
    const current = favoritesByUser.get(userId) ?? [];
    if (current.length < 4) current.push(favorite);
    favoritesByUser.set(userId, current);
  }

  const summary = summaryRows[0] ?? {
    totalUsers: 0,
    regularUsers: 0,
    admins: 0,
    missingVerificationRecords: 0,
  };

  return NextResponse.json({
    users: userDocuments.map(({ phoneVerifiedAt, ...user }) => ({
      ...user,
      phoneVerificationStatus: phoneVerifiedAt instanceof Date
        ? "verified"
        : "no_record",
      totalPurchase: purchasesByUser.get(String(user._id))?.totalPurchase ?? 0,
      successfulOrders: purchasesByUser.get(String(user._id))?.successfulOrders ?? 0,
      addressCount: addressesByUser.get(String(user._id)) ?? 0,
      commentCount: commentsByUser.get(String(user._id)) ?? 0,
      favorites: favoritesByUser.get(String(user._id)) ?? [],
    })),
    summary: { ...summary, successfulOrders, totalComments },
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}
