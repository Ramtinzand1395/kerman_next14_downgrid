import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import Order from "@/model/Order";
import Notification from "@/model/Notification";
import User from "@/model/User";
// todo
// مقایشه قیمت فرانت و بک اند کاربر قیمت وارد نکنه
interface OrderItem {
  productId: string;
  price: number;
  quantity: number;
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    addressId,
    items,
    shippingCost,
  }: { addressId: string; items: OrderItem[]; shippingCost: number } =
    await req.json();

  const totalPrice = items.reduce(
    (a: number, i: OrderItem) => a + i.price * i.quantity,
    0
  );
  const finalPrice = totalPrice + shippingCost;

  const order = await Order.create({
    user: session.user.id,
    address: addressId,
    items: items.map((i) => ({
      product: i.productId,
      price: i.price,
      quantity: i.quantity,
      total: i.price * i.quantity,
    })),
    totalPrice,
    shippingCost,
    finalPrice,
  });
  await User.findByIdAndUpdate(session.user.id, {
    $push: { orders: order._id },
  });

  await Notification.create({
    title: "سفارش جدید",
    message: "یک سفارش جدید ثبت شد",
    type: "order",
    target: {
      kind: "Order",
      item: order._id,
    },
  });

  return NextResponse.json(order);
}
