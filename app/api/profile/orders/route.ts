import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
import TempPayment from "@/model/TempPayment";
import "@/model/Address";
import "@/model/Product";
import { ensurePaidOrderIdentifiers } from "@/lib/orderIdentifiers";
import { toOrderDto } from "@/lib/orderDto";

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "کاربر وارد نشده" },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Vary: "Cookie",
        },
      },
    );
  }

  const orders = await Order.find({ user: session.user.id })
    .populate({ path: "items.product", select: "title mainImage sku" })
    .populate({
      path: "address",
      select: "province city address plaque unit postalCode",
    })
    .sort({ createdAt: -1 })
    .lean();

  await Promise.all(
    orders
      .filter(
        (order: any) =>
          order.paymentStatus === "paid" &&
          (!order.invoiceNumber || !order.trackingCode),
      )
      .map((order: any) => ensurePaidOrderIdentifiers(order._id)),
  );

  const refreshedOrders = orders.some(
    (order: any) =>
      order.paymentStatus === "paid" &&
      (!order.invoiceNumber || !order.trackingCode),
  )
    ? await Order.find({ user: session.user.id })
        .populate({ path: "items.product", select: "title mainImage sku" })
        .populate({
          path: "address",
          select: "province city address plaque unit postalCode",
        })
        .sort({ createdAt: -1 })
        .lean()
    : orders;

  // return NextResponse.json(orders);
  const unpaidTempOrders = await TempPayment.find({
    userId: session.user.id,
    status: { $in: ["initiated", "paid_pending", "refund_required"] },
  })
    .populate({ path: "items.product", select: "title mainImage sku" })
    .populate({
      path: "address",
      select: "province city address plaque unit postalCode",
    })
    .lean()
    .sort({ createdAt: -1 });
  const mappedTempOrders = unpaidTempOrders.map((payment: any) =>
    toOrderDto(payment, "payment_attempt"),
  );

  const mappedOrders = refreshedOrders.map((order: any) =>
    toOrderDto(order, "order"),
  );

  const mergedOrders = [...mappedOrders, ...mappedTempOrders].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json(mergedOrders, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}
