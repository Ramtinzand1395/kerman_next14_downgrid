import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../auth/[...nextauth]/options";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

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
  const range = searchParams.get("range") || "monthly";

  const now = new Date();
  let startDate = new Date();

  if (range === "daily") startDate.setDate(now.getDate() - 30);
  if (range === "monthly") startDate.setMonth(now.getMonth() - 12);
  if (range === "yearly") startDate.setFullYear(now.getFullYear() - 5);

  let groupBy: any = {};
  if (range === "daily")
    groupBy = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
      day: { $dayOfMonth: "$createdAt" },
    };
  if (range === "monthly")
    groupBy = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
    };
  if (range === "yearly") groupBy = { year: { $year: "$createdAt" } };

  try {
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: startDate } } },
      { $group: { _id: groupBy, totalRevenue: { $sum: "$finalPrice" } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const formattedData = revenueData.map((item) => {
      let label = "";
      if (range === "daily")
        label = `${item._id.year}-${item._id.month}-${item._id.day}`;
      if (range === "monthly") label = `${item._id.year}-${item._id.month}`;
      if (range === "yearly") label = `${item._id.year}`;
      return { label, value: item.totalRevenue };
    });

    return NextResponse.json({ data: formattedData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
