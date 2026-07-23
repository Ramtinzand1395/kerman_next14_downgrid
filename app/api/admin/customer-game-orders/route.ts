import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import CustomerGameOrder from "@/model/CustomerGameOrder";
import { authOptions } from "../../auth/[...nextauth]/options";

// GET لیست سفارش‌های بازی مشتری — فقط superadmin
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "10", 10), 1);
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "totalPrice",
      "customerName",
    ];
    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const total = await CustomerGameOrder.countDocuments(filter);

    const orders = await CustomerGameOrder.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username mobile")
      .lean();

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Customer orders fetch failed:", error);
    return NextResponse.json(
      { error: "خطایی در دریافت سفارشات رخ داد." },
      { status: 500 },
    );
  }
}
