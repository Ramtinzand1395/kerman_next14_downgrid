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

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  const orders = await Order.find({ user: session.user.id })
    .populate("items.product")
    .populate("address")
    .lean()
    .sort({ createdAt: -1 });

  // return NextResponse.json(orders);
  const unpaidTempOrders = await TempPayment.find({
    userId: session.user.id,
    status: { $in: ["initiated", "paid_pending", "refund_required"] },
  })
    .populate("items.product")
    .populate("address")
    .lean()
    .sort({ createdAt: -1 });
  const mappedTempOrders = unpaidTempOrders.map((payment: any) => ({
    ...payment,
    source: "temp_payment",
    id: payment._id,
    paymentStatus: "unpaid",
    status: payment.status,
  }));

  const mergedOrders = [...orders, ...mappedTempOrders].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json(mergedOrders);
}
