// import dbConnect from "@/lib/mongodb";
// import Order from "@/model/Order";
// import { getServerSession } from "next-auth";
// import { NextRequest, NextResponse } from "next/server";
// import { authOptions } from "../../auth/[...nextauth]/options";
// import "@/model/Address";
// import "@/model/User";
// import "@/model/Product";

// export async function GET(req: Request) {
//   await dbConnect();
//   const session = await getServerSession(authOptions);

//   if (!session?.user) {
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//   }
//   if (session.user.role !== "superadmin") {
//     return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
//   }

//   const { searchParams } = new URL(req.url);
//   const page = Number(searchParams.get("page") || 1);
//   const limit = 10;
//   const skip = (page - 1) * limit;

//   const [orders, total] = await Promise.all([
//     Order.find()
//       .populate("user")
//       .populate("items.product")
//       .populate("address")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),

//     Order.countDocuments(),
//   ]);

//   return NextResponse.json({
//     orders,
//     total,
//     pages: Math.ceil(total / limit),
//   });
// }

// export async function PUT(req: NextRequest) {
//   await dbConnect();

//   const session = await getServerSession(authOptions);
//   if (!session || session.user.role !== "superadmin")
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

//   const { status, orderId } = await req.json();

//   const validStatuses = [
//     "pending",
//     "processing",
//     "shipped",
//     "delivered",
//     "cancelled",
//   ];
//   if (!validStatuses.includes(status))
//     return NextResponse.json({ error: "Invalid status" }, { status: 400 });

//   const order = await Order.findByIdAndUpdate(
//     orderId,
//     { status },
//    { returnDocument: 'after' },
//   );

//   return NextResponse.json(order);
// }

// !جدید باشگاه مشتریان

import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import "@/model/Address";
import "@/model/User";
import "@/model/Product";

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
  const page = Number(searchParams.get("page") || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find()
      .populate("user")
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Order.countDocuments(),
  ]);

  return NextResponse.json({
    orders,
    total,
    pages: Math.ceil(total / limit),
  });
}

export async function PUT(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { status, orderId } = await req.json();

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  // فقط در صورتی به کیف پول برگردان که قبلاً لغو نشده باشد — اتمیک و idempotent
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $ne: "cancelled" } },
    { status },
    { returnDocument: "after" },
  );
  if (!order) {
    return NextResponse.json(
      { error: "سفارش یافت نشد یا قبلاً لغو شده است" },
      { status: 409 },
    );
  }

  // بازگشت مبلغ سفارش لغوشده به کیف پول کاربر (فقط سفارش‌های پرداخت‌شده)
  // خطای این بخش تغییر وضعیت را برنمی‌گرداند ولی لاگ می‌شود.
  if (status === "cancelled" && order.paymentStatus === "paid") {
    try {
      const { credit } = await import("@/lib/loyalty/wallet.service");
      const { releaseCoupon } = await import("@/lib/loyalty/coupon.service");
      await credit({
        userId: order.user.toString(),
        amount: order.finalPrice,
        type: "refund",
        idempotencyKey: `refund:${order._id.toString()}`,
        ref: { kind: "Order", item: order._id },
        description: `بازگشت وجه سفارش لغوشده`,
        performedBy: session.user.id,
        notify: {
          title: "بازگشت وجه به کیف پول",
          message: `مبلغ ${Number(order.finalPrice).toLocaleString("fa-IR")} تومان بابت لغو سفارش به کیف پول شما برگشت.`,
        },
      });
      // آزادسازی کوپن استفاده‌شده (در صورت وجود)
      await releaseCoupon(order._id.toString());
    } catch (err) {
      console.error("[loyalty] refund on cancel failed:", err);
    }
  }

  return NextResponse.json(order);
}
