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
  variantId?: string;
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      { error: "درخواست سفارش نامعتبر است." },
      { status: 400 },
    );
  }

  if (!mongoose.isValidObjectId(payload.addressId)) {
    return NextResponse.json(
      { error: "شناسه آدرس معتبر نیست." },
      { status: 400 },
    );
  }

  const address = await Address.findOne({
    _id: payload.addressId,
    userId: session.user.id,
  }).lean();

  if (!address) {
    return NextResponse.json(
      { error: "آدرس انتخابی معتبر نیست." },
      { status: 400 },
    );
  }

  const normalizedItems = payload.items
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      variantId: item.variantId,
    }))
    .filter(
      (item) =>
        mongoose.isValidObjectId(item.productId) &&
        (!item.variantId || mongoose.isValidObjectId(item.variantId)) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );

  if (normalizedItems.length !== payload.items.length) {
    return NextResponse.json(
      { error: "اطلاعات اقلام سفارش نامعتبر است." },
      { status: 400 },
    );
  }

  const productIds = normalizedItems.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } })
    .select("price discountPrice stock productType variants")
    .lean();

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "برخی از محصولات نامعتبر هستند." },
      { status: 400 },
    );
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  try {
    const orderItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      const hasVariants =
        product.productType === "multi" && Array.isArray(product.variants);

      if (hasVariants) {
        const selectedVariant = product.variants?.find(
          (variant: any) => String(variant._id) === String(item.variantId),
        );

        if (!selectedVariant) {
          throw new Error("INVALID_VARIANT");
        }

        if (Number(selectedVariant.stock || 0) < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const unitPrice =
          selectedVariant.discountPrice ?? selectedVariant.price;

        return {
          product: item.productId,
          variantId: selectedVariant._id,
          variantTitle: selectedVariant.title,
          price: Number(selectedVariant.price || 0),
          discountPrice:
            selectedVariant.discountPrice === null ||
            selectedVariant.discountPrice === undefined
              ? null
              : Number(selectedVariant.discountPrice),
          quantity: item.quantity,
          total: Number(unitPrice || 0) * item.quantity,
        };
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
        { error: "هزینه ارسال نامعتبر است." },
        { status: 400 },
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
        { status: 500 },
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
        { error: "موجودی برخی محصولات کافی نیست." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_VARIANT") {
      return NextResponse.json(
        { error: "مدل انتخابی برای محصول معتبر نیست." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "اطلاعات اقلام سفارش نامعتبر است." },
      { status: 400 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
