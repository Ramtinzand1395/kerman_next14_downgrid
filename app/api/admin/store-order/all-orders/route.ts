import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import StoreOrder from "@/model/StoreOrder";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import moment from "moment-jalaali";
import { Filter } from "mongodb";
import { storeOrder } from "@/types";

moment.loadPersian({ usePersianDigits: false });

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  const { searchParams } = new URL(req.url);

  // pagination
  const page = Number(searchParams.get("page")) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // filters
  const startDate = searchParams.get("startDate"); // 1404/09/15
  const endDate = searchParams.get("endDate"); // 1404/09/26
  const mobile = searchParams.get("mobile");
  const lastName = searchParams.get("lastName");

  /* ================= Order Filter ================= */
  const matchOrder: Filter<storeOrder> = {
    deliveryStatus: { $ne: "تحویل به مشتری" },
  };

  if (startDate || endDate) {
    matchOrder.createdAt = {};

    if (startDate) {
      matchOrder.createdAt.$gte = moment(startDate, "jYYYY/jMM/jDD")
        .startOf("day")
        .toDate();
    }

    if (endDate) {
      matchOrder.createdAt.$lte = moment(endDate, "jYYYY/jMM/jDD")
        .endOf("day")
        .toDate();
    }
  }

  /* ================= Customer Filter ================= */
  const matchCustomer: Filter<storeOrder> = {};

  if (mobile) {
    matchCustomer["customer.mobile"] = {
      $regex: mobile,
      $options: "i",
    };
  }

  if (lastName) {
    matchCustomer["customer.lastName"] = {
      $regex: lastName,
      $options: "i",
    };
  }

  /* ================= Aggregation ================= */
  const pipeline:any[] = [
    { $match: matchOrder },

    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },

    Object.keys(matchCustomer).length ? { $match: matchCustomer } : null,

    { $sort: { createdAt: -1 } },

    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ].filter(Boolean);

  const result = await StoreOrder.aggregate(pipeline);

  const orders = result[0]?.data || [];
  const total = result[0]?.total[0]?.count || 0;

  return NextResponse.json({
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
