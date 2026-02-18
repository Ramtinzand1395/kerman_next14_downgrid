// import dbConnect from "@/lib/mongodb";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]/options";
// import { NextResponse } from "next/server";
// import Order from "@/model/Order";
// import Notification from "@/model/Notification";
// import User from "@/model/User";

// interface OrderItem {
//   productId: string;
//   price: number;
//   quantity: number;
// }

// export async function POST(req: Request) {
//   await dbConnect();
//   const session = await getServerSession(authOptions);
//   if (!session)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const {
//     addressId,
//     items,
//     shippingCost,
//   }: { addressId: string; items: OrderItem[]; shippingCost: number } =
//     await req.json();

//   const totalPrice = items.reduce(
//     (a: number, i: OrderItem) => a + i.price * i.quantity,
//     0
//   );
//   const finalPrice = totalPrice + shippingCost;

//   const order = await Order.create({
//     user: session.user.id,
//     address: addressId,
//     items: items.map((i) => ({
//       product: i.productId,
//       price: i.price,
//       quantity: i.quantity,
//       total: i.price * i.quantity,
//     })),
//     totalPrice,
//     shippingCost,
//     finalPrice,
//   });
//   await User.findByIdAndUpdate(session.user.id, {
//     $push: { orders: order._id },
//   });

//   await Notification.create({
//     title: "سفارش جدید",
//     message: "یک سفارش جدید ثبت شد",
//     type: "order",
//     target: {
//       kind: "Order",
//       item: order._id,
//     },
//   });

//   return NextResponse.json(order);
// }


import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import Order from "@/model/Order";
import Notification from "@/model/Notification";
import User from "@/model/User";
import Address from "@/model/Address";
import Product from "@/model/Product";
import mongoose from "mongoose";

interface OrderItem {
  productId: string;
  quantity: number;
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: {
    addressId?: string;
    items?: OrderItem[];
    shippingCost?: number;
  } = await req.json();

  if (
    !payload.addressId ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  if (!mongoose.isValidObjectId(payload.addressId)) {
    return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
  }

  const address = await Address.findOne({
    _id: payload.addressId,
    userId: session.user.id,
  }).lean();

  if (!address) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const normalizedItems = payload.items
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }))
    .filter(
      (item) =>
        mongoose.isValidObjectId(item.productId) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );

  if (normalizedItems.length !== payload.items.length) {
    return NextResponse.json({ error: "Invalid order items" }, { status: 400 });
  }

  const productIds = normalizedItems.map((item) => item.productId);

  const products = await Product.find({ _id: { $in: productIds } })
    .select("price discountPrice stock")
    .lean();

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "Some products were not found" },
      { status: 404 }
    );
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product])
  );

  try {
    const orderItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if ((product.stock ?? 0) < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = product.discountPrice ?? product.price;

      return {
        product: item.productId,
        price: product.price,
        discountPrice: product.discountPrice,
        quantity: item.quantity,
        total: unitPrice * item.quantity,
      };
    });

    const shippingCost = Number(payload.shippingCost ?? 0);
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      return NextResponse.json(
        { error: "Invalid shipping cost" },
        { status: 400 }
      );
    }

    const totalPrice = orderItems.reduce((a: number, i) => a + i.total, 0);
    const finalPrice = totalPrice + shippingCost;

    let order;
    try {
      order = await Order.create({
        user: session.user.id,
        address: payload.addressId,
        items: orderItems,
        totalPrice,
        shippingCost,
        finalPrice,
      });
    } catch {
      return NextResponse.json(
        { error: "Order could not be created" },
        { status: 500 }
      );
    }

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
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Insufficient product stock" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Invalid order items" }, { status: 400 });
  }
}
