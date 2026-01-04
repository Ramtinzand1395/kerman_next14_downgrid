import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function GET() {
  await dbConnect();
   const session = await getServerSession(authOptions);
 
     if (!session?.user) {
       return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
     }

  const orders = await Order.find({ user: session.user.id })
    .populate("items.product")
    .populate("address")
    .sort({ createdAt: -1 });

  return NextResponse.json(orders);
}
