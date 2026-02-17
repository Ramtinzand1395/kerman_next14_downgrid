
import dbConnect from "@/lib/mongodb";
import User from "@/model/User";
import Order from "@/model/Order";
import Product from "@/model/Product";
import StoreOrder from "@/model/StoreOrder";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "monthly";

  const now = new Date();
  let fromDate = new Date();

  if (range === "daily") fromDate.setDate(now.getDate() - 1);
  if (range === "weekly") fromDate.setDate(now.getDate() - 7);
  if (range === "monthly") fromDate.setMonth(now.getMonth() - 1);
  if (range === "yearly") fromDate.setFullYear(now.getFullYear() - 1);

  const dateFilter = { createdAt: { $gte: fromDate } };

  try {
    const usersCount = await User.countDocuments(dateFilter);
    const productsCount = await Product.countDocuments(dateFilter);
    const ordersCount = await Order.countDocuments(dateFilter);
    const listOrdersCount = await StoreOrder.countDocuments(dateFilter);

    const deliveredOrders = await Order.countDocuments({ ...dateFilter, status: "delivered" });

    const totalRevenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid", ...dateFilter } },
      { $group: { _id: null, total: { $sum: "$finalPrice" } } },
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    const orderStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const paymentStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      usersCount,
      productsCount,
      ordersCount,
      deliveredOrders,
      listOrdersCount,
      totalRevenue,
      orderStatus,
      paymentStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
