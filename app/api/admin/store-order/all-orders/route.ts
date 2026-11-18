import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Appointment from "@/model/Appointment";
import { websiteStoreOrders } from "@/lib/appointments/store-order";
import StoreOrder from "@/model/StoreOrder";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import moment from "moment-jalaali";
import type { Filter } from "mongodb";
import type { storeOrder } from "@/types";
import { toStoreCustomer } from "@/lib/store-customer-account";
import { storeOrderCustomerJoin } from "@/lib/store-order-identity";

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
  // const limit = 10;
  // const skip = (page - 1) * limit;
   const parsedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
   const skip = limit ? (page - 1) * limit : 0;

  // filters
  const startDate = searchParams.get("startDate"); // 1404/09/15
  const endDate = searchParams.get("endDate"); // 1404/09/26
  const mobile = searchParams.get("mobile");
  const lastName = searchParams.get("lastName");

  /* ================= Order Filter ================= */
  // const matchOrder: Filter<storeOrder> = {
  //   deliveryStatus: { $ne: "تحویل به مشتری" },
  // };
  const matchOrder: Filter<storeOrder> = {};

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
  const pattern = (value: string) => new RegExp(value.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const matchCustomer = [
    ...(mobile ? [{ $or: ["customer.mobile", "customerSnapshot.mobile"].map((key) => ({ [key]: pattern(mobile) })) }] : []),
    ...(lastName ? [{ $or: ["customer.lastName", "customer.username", "customer.storeProfile.lastName", "customerSnapshot.lastName"].map((key) => ({ [key]: pattern(lastName) })) }] : []),
  ];

  /* ================= Aggregation ================= */
  const pipeline:any[] = [
    { $match: matchOrder },

    ...storeOrderCustomerJoin(),
    { $unionWith: {
      coll: Appointment.collection.name,
      pipeline: [...websiteStoreOrders(false), { $match: matchOrder }],
    } },

    matchCustomer.length ? { $match: { $and: matchCustomer } } : null,

    { $sort: { createdAt: -1 } },

    {
      $facet: {
        // data: [{ $skip: skip }, { $limit: limit }],
         data: [
         ...(limit ? [{ $skip: skip }, { $limit: limit }] : []),
        ],
        total: [{ $count: "count" }],
      },
    },
  ].filter(Boolean);

  const result = await StoreOrder.aggregate(pipeline);

  const orders = (result[0]?.data ?? []).map((order: any) => ({
    ...order, customer: order.customer ? toStoreCustomer(order.customer) : undefined,
  }));
  const total = result[0]?.total[0]?.count || 0;

  return NextResponse.json({
    orders,
    pagination: {
      page,
      limit,
      total,
      // totalPages: Math.ceil(total / limit),
       totalPages: limit ? Math.ceil(total / limit) : 1,
    },
  });
}
