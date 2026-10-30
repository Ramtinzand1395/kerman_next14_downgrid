
import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import "@/model/Address";
import "@/model/User";
import "@/model/Product";
import { notifyUser } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      .limit(limit)
      .lean(),

    Order.countDocuments(),
  ]);

  return NextResponse.json({
    orders: orders.map((order: any) => {
      const isCollect =
        order.shipping?.paymentTiming === "on_delivery" ||
        order.shipping?.feeStatus === "pending_carrier" ||
        order.shippingPaymentType === "COLLECT";
      const storedShippingFee = Number(order.shipping?.feeToman ?? order.shippingCost);
      const shippingFeeToman = isCollect
        ? null
        : Number.isSafeInteger(storedShippingFee) && storedShippingFee > 0
          ? storedShippingFee
          : null;
      return {
        ...order,
        address: order.addressSnapshot ?? order.address ?? null,
        financials: {
          itemsSubtotalToman: Number(order.totalPrice || 0),
          couponDiscountToman: Number(order.couponDiscount || 0),
          shippingFeeToman,
          onlinePaymentAmountToman: Number(order.finalPrice || 0),
          shippingIncludedInOnlinePayment: shippingFeeToman !== null,
        },
      };
    }),
    total,
    pages: Math.ceil(total / limit),
  });
}

export async function PUT(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { status, orderId, shippingTrackingCode } = await req.json();

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (status !== undefined && !validStatuses.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (
    shippingTrackingCode !== undefined &&
    (typeof shippingTrackingCode !== "string" || shippingTrackingCode.trim().length > 64)
  ) {
    return NextResponse.json({ error: "Invalid shipping tracking code" }, { status: 400 });
  }
  if (status === undefined && shippingTrackingCode === undefined) {
    return NextResponse.json({ error: "No update was provided" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  if (status !== undefined) set.status = status;
  if (shippingTrackingCode !== undefined) {
    set["shipping.trackingCode"] = shippingTrackingCode.trim() || null;
  }

  // فقط در صورتی به کیف پول برگردان که قبلاً لغو نشده باشد — اتمیک و idempotent
  const order = await Order.findOneAndUpdate(
    { _id: orderId, ...(status !== undefined ? { status: { $ne: "cancelled" } } : {}) },
    { $set: set },
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

  const statusInfo: Record<string, { title: string; message: string; type: string; priority?: "high" }> = {
    pending: { title: "سفارش در حال بررسی است", message: "سفارش شما در صف بررسی قرار دارد.", type: "ORDER_CREATED" },
    processing: { title: "سفارش در حال آماده‌سازی است", message: "آماده‌سازی سفارش شما آغاز شد.", type: "ORDER_PROCESSING" },
    shipped: { title: "سفارش ارسال شد", message: "سفارش شما تحویل واحد ارسال شد.", type: "ORDER_SHIPPED" },
    delivered: { title: "سفارش تکمیل شد", message: "سفارش شما با موفقیت تکمیل شد.", type: "ORDER_COMPLETED" },
    cancelled: { title: "سفارش لغو شد", message: "سفارش شما لغو شد. در صورت پرداخت، مبلغ به کیف پول بازمی‌گردد.", type: "ORDER_CANCELLED", priority: "high" },
  };
  const notification = status ? statusInfo[status] : undefined;
  if (order.user && notification) {
    await notifyUser({
      userId: order.user,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: "order",
      entityType: "Order",
      entityId: order._id,
      link: "/my-profile?step=5",
      priority: notification.priority,
      senderType: "admin",
      senderId: session.user.id,
      eventKey: `ORDER_STATUS_CHANGED:${order._id}:${status}`,
    }).catch((error) => console.error("[notifications] order-status event failed:", error));
  }

  return NextResponse.json(order);
}
