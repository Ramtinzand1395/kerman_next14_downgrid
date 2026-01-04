import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import "@/model/Address";
import "@/model/User";
import "@/model/Product";

// export async function GET() {
//   await dbConnect();
//   const session = await getServerSession(authOptions);

//   if (!session?.user) {
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//   }

//   if (session.user.role !== "superadmin") {
//     return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
//   }

//   const orders = await Order.find()
//     .populate("items.product")
//     .populate("address")
//     .populate("user")
//     .sort({ createdAt: -1 });

//   return NextResponse.json(orders);
// }

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
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

  const order = await Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true }
  );

  return NextResponse.json(order);
}
