// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/mongodb";
// import StoreOrder from "@/model/StoreOrder";
// import { authOptions } from "../../../auth/[...nextauth]/options";
// import { getServerSession } from "next-auth";
// export const dynamic = "force-dynamic";
// export const revalidate = 0;
// export const runtime = "nodejs";
// export const fetchCache = "force-no-store";

// export async function GET(req: Request) {
//   await dbConnect();
//   const session = await getServerSession(authOptions);

//   if (!session?.user) {
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//   }

//   const { searchParams } = new URL(req.url);
//   const range = searchParams.get("range") || "monthly";

//   const now = new Date();
//   let startDate = new Date();

//   switch (range) {
//     case "daily":
//       startDate.setDate(now.getDate() - 1);
//       break;
//     case "weekly":
//       startDate.setDate(now.getDate() - 7);
//       break;
//     case "monthly":
//       startDate.setMonth(now.getMonth() - 1);
//       break;
//     case "yearly":
//       startDate.setFullYear(now.getFullYear() - 1);
//       break;
//   }

//   const orders = await StoreOrder.find({
//     createdAt: { $gte: startDate, $lte: now },
//   }).select("createdAt price");

//   const grouped: Record<string, number> = {};
//   orders.forEach((order) => {
//     const day = order.createdAt.toISOString().split("T")[0];
//     if (!grouped[day]) grouped[day] = 0;
//     grouped[day] += order.price;
//   });

//   const data = Object.keys(grouped)
//     .sort()
//     .map((day) => ({ date: day, price: grouped[day] }));

//   return NextResponse.json({ data });
// }

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import StoreOrder from "@/model/StoreOrder";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
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

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "monthly";

  const now = new Date();
  const startDate = new Date(now);
  let groupBy: Record<string, unknown>;
  let sortStage: Record<string, 1>;

  switch (range) {
    case "daily":
      startDate.setHours(0, 0, 0, 0);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      sortStage = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
      break;
    case "weekly":
      startDate.setDate(now.getDate() - 7);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      sortStage = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
      break;
    case "yearly":
      startDate.setFullYear(now.getFullYear() - 1);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      sortStage = { "_id.year": 1, "_id.month": 1 };
      break;
    case "monthly":
    default:
      startDate.setMonth(now.getMonth() - 1);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      sortStage = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
      break;
  }

  const revenueData = await StoreOrder.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: now } } },
    { $group: { _id: groupBy, totalRevenue: { $sum: "$price" } } },
    { $sort: sortStage },
  ]);

  const data = revenueData.map((item) => {
    if (range === "yearly") {
      return {
        date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        price: item.totalRevenue,
      };
    }

    return {
      date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
      price: item.totalRevenue,
    };
  });

  return NextResponse.json({ data });
}
