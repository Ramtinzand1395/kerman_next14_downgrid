import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import Order from "@/model/Order";
import User from "@/model/User";
import Address from "@/model/Address";
import Product from "@/model/Product";
import mongoose from "mongoose";
import { createAddressSnapshot } from "@/lib/addressSnapshot";
import { notifyAdmins, notifyUser } from "@/lib/notifications/service";
import {
  calculateShippingInfo,
  InvalidShippingDestinationError,
} from "@/lib/shipping";

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

  const uniqueProductIds = [
    ...new Set(normalizedItems.map((item) => item.productId)),
  ];
  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    status: "published",
    deletedAt: null,
  })
    .select("title price discountPrice stock productType variants status deletedAt")
    .lean();

  if (products.length !== uniqueProductIds.length) {
    return NextResponse.json(
      { error: "برخی از محصولات نامعتبر یا ناموجود هستند." },
      { status: 400 },
    );
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const requestedQtyByVariant = new Map<string, number>();
  const requestedQtyByProduct = new Map<string, number>();
  for (const item of normalizedItems) {
    if (item.variantId) {
      const vKey = `${item.productId}:${item.variantId}`;
      requestedQtyByVariant.set(
        vKey,
        (requestedQtyByVariant.get(vKey) || 0) + item.quantity,
      );
    }
    requestedQtyByProduct.set(
      item.productId,
      (requestedQtyByProduct.get(item.productId) || 0) + item.quantity,
    );
  }

  try {
    const orderItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      const hasVariants =
        product.productType === "multi" && Array.isArray(product.variants);

      if (hasVariants) {
        if (!item.variantId) {
          throw new Error("VARIANT_REQUIRED");
        }

        const selectedVariant = product.variants?.find(
          (variant: any) =>
            String(variant._id) === String(item.variantId) &&
            variant.isActive !== false,
        );

        if (!selectedVariant) {
          throw new Error("INVALID_VARIANT");
        }

        const totalVariantQty =
          requestedQtyByVariant.get(`${item.productId}:${item.variantId}`) ||
          item.quantity;
        if (Number(selectedVariant.stock || 0) < totalVariantQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const totalProductQty =
          requestedQtyByProduct.get(item.productId) || item.quantity;
        if (Number(product.stock || 0) < totalProductQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const unitPrice =
          selectedVariant.discountPrice ?? selectedVariant.price;

        return {
          product: item.productId,
          productTitle: product.title,
          variantId: selectedVariant._id,
          variantTitle: selectedVariant.title,
          variantSku: selectedVariant.sku,
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

      if (product.productType === "multi") {
        throw new Error("VARIANT_REQUIRED");
      }

      const totalProductQty =
        requestedQtyByProduct.get(item.productId) || item.quantity;
      if (Number(product.stock ?? 0) < totalProductQty) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = product.discountPrice ?? product.price;

      return {
        product: item.productId,
        productTitle: product.title,
        price: Number(product.price || 0),
        discountPrice:
          product.discountPrice === null || product.discountPrice === undefined
            ? null
            : Number(product.discountPrice),
        quantity: item.quantity,
        total: Number(unitPrice || 0) * item.quantity,
      };
    });

    const shippingInfo = calculateShippingInfo({
      province: address.province,
      city: address.city,
    });
    const shippingCost = shippingInfo.cost;
    const shippingPaymentType = shippingInfo.paymentType;

    const totalPrice = orderItems.reduce((a: number, i) => a + i.total, 0);
    const finalPrice = totalPrice + shippingCost;

    let order;
    try {
      order = await Order.create({
        user: session.user.id,
        address: payload.addressId,
        addressSnapshot: createAddressSnapshot(address),
        items: orderItems,
        totalPrice,
        shippingCost,
        shippingPaymentType,
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

    await Promise.all([
      notifyUser({
        userId: session.user.id,
        title: "سفارش شما ثبت شد",
        message: "سفارش شما ثبت شد و در انتظار پرداخت یا بررسی است.",
        type: "ORDER_CREATED",
        category: "order",
        entityType: "Order",
        entityId: order._id,
        link: "/my-profile?step=5",
        eventKey: `ORDER_CREATED:${order._id}`,
      }),
      notifyAdmins({
        title: "سفارش جدید ثبت شد",
        message: `سفارش جدید به مبلغ ${Number(order.finalPrice).toLocaleString("fa-IR")} تومان ثبت شد.`,
        type: "NEW_ORDER_ADMIN",
        category: "order",
        entityType: "Order",
        entityId: order._id,
        link: "/dashboard/orders",
        priority: "high",
        eventKey: `NEW_ORDER_ADMIN:${order._id}`,
      }),
    ]).catch((error) => console.error("[notifications] order-created event failed:", error));

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof InvalidShippingDestinationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "موجودی برخی محصولات کافی نیست." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "VARIANT_REQUIRED") {
      return NextResponse.json(
        { error: "انتخاب مدل برای محصول چندمدلی الزامی است." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_VARIANT") {
      return NextResponse.json(
        { error: "مدل انتخابی برای محصول معتبر یا فعال نیست." },
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
