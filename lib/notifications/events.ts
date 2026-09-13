import mongoose from "mongoose";
import Product from "@/model/Product";
import { notifyAdmins, notifyUser } from "./service";

export async function notifyOrderPaid(input: {
  orderId: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  gateway: "wallet" | "zarinpal";
}) {
  const orderId = input.orderId.toString();
  await Promise.all([
    notifyUser({
      userId: input.userId,
      title: "سفارش شما ثبت شد",
      message: "سفارش شما با موفقیت ثبت شد و در انتظار پردازش است.",
      type: "ORDER_CREATED",
      category: "order",
      entityType: "Order",
      entityId: input.orderId,
      link: "/my-profile?step=5",
      eventKey: `ORDER_CREATED:${orderId}`,
    }),
    notifyUser({
      userId: input.userId,
      title: "پرداخت با موفقیت انجام شد",
      message: `پرداخت شما به مبلغ ${input.amount.toLocaleString("fa-IR")} تومان با موفقیت ثبت شد.`,
      type: "PAYMENT_SUCCESS",
      category: "payment",
      entityType: "Order",
      entityId: input.orderId,
      link: "/my-profile?step=5",
      eventKey: `PAYMENT_SUCCESS:${orderId}`,
      metadata: { gateway: input.gateway, amount: input.amount },
    }),
    notifyAdmins({
      title: "سفارش جدید ثبت شد",
      message: `یک سفارش جدید به مبلغ ${input.amount.toLocaleString("fa-IR")} تومان ثبت شد.`,
      type: "NEW_ORDER_ADMIN",
      category: "order",
      entityType: "Order",
      entityId: input.orderId,
      link: "/dashboard/orders",
      priority: "high",
      eventKey: `NEW_ORDER_ADMIN:${orderId}`,
    }),
    notifyAdmins({
      title: "پرداخت جدید",
      message: `پرداخت سفارش به مبلغ ${input.amount.toLocaleString("fa-IR")} تومان تایید شد.`,
      type: "PAYMENT_SUCCESS",
      category: "payment",
      entityType: "Order",
      entityId: input.orderId,
      link: "/dashboard/orders",
      eventKey: `ADMIN_PAYMENT_SUCCESS:${orderId}`,
      metadata: { gateway: input.gateway, amount: input.amount },
    }),
    ...(input.gateway === "wallet"
      ? [
          notifyUser({
            userId: input.userId,
            title: "برداشت از کیف پول",
            message: `مبلغ ${input.amount.toLocaleString("fa-IR")} تومان بابت پرداخت سفارش از کیف پول شما کسر شد.`,
            type: "WALLET_DEBITED",
            category: "wallet",
            entityType: "Order",
            entityId: input.orderId,
            link: "/my-profile?step=8",
            eventKey: `WALLET_DEBITED:${orderId}`,
          }),
        ]
      : []),
  ]);
}

export async function notifyPaymentFailed(input: {
  userId: string | mongoose.Types.ObjectId;
  paymentId: string;
  message?: string;
}) {
  await Promise.all([
    notifyUser({
      userId: input.userId,
      title: "پرداخت انجام نشد",
      message: input.message || "پرداخت شما ناموفق بود؛ در صورت کسر وجه، وضعیت تراکنش را بررسی کنید.",
      type: "PAYMENT_FAILED",
      category: "payment",
      link: "/payment-failed",
      priority: "high",
      eventKey: `PAYMENT_FAILED:${input.paymentId}`,
    }),
    notifyAdmins({
      title: "خطا در پرداخت",
      message: `پرداخت با شناسه ${input.paymentId} ناموفق بود و نیاز به بررسی دارد.`,
      type: "PAYMENT_FAILED",
      category: "payment",
      link: "/dashboard/orders",
      priority: "high",
      eventKey: `ADMIN_PAYMENT_FAILED:${input.paymentId}`,
    }),
  ]);
}

export async function notifyPaymentReviewRequired(input: {
  userId: string | mongoose.Types.ObjectId;
  paymentId: string;
}) {
  await Promise.all([
    notifyUser({
      userId: input.userId,
      title: "پرداخت در حال بررسی است",
      message: "نتیجه پرداخت شما قطعی نشده است. پشتیبانی وضعیت تراکنش را بررسی می‌کند.",
      type: "PAYMENT_REVIEW_REQUIRED",
      category: "payment",
      link: "/payment-pending",
      priority: "high",
      eventKey: `PAYMENT_REVIEW_REQUIRED:${input.paymentId}`,
    }),
    notifyAdmins({
      title: "پرداخت نیازمند بررسی",
      message: `پرداخت با شناسه ${input.paymentId} در وضعیت نامشخص قرار دارد.`,
      type: "PAYMENT_REVIEW_REQUIRED",
      category: "payment",
      link: "/dashboard/orders",
      priority: "urgent",
      eventKey: `ADMIN_PAYMENT_REVIEW_REQUIRED:${input.paymentId}`,
    }),
  ]);
}

export async function notifyLowInventory(productIds: Array<string | mongoose.Types.ObjectId>) {
  const ids = [...new Set(productIds.map(String))];
  if (!ids.length) return;
  const products = await Product.find({ _id: { $in: ids }, stock: { $lte: 5 } })
    .select("title stock updatedAt")
    .lean();

  await Promise.all(products.map((product) => {
    const out = Number(product.stock) <= 0;
    return notifyAdmins({
      title: out ? "موجودی محصول تمام شد" : "موجودی محصول رو به اتمام است",
      message: out
        ? `موجودی «${product.title}» به پایان رسیده است.`
        : `فقط ${Number(product.stock).toLocaleString("fa-IR")} عدد از «${product.title}» باقی مانده است.`,
      type: out ? "PRODUCT_OUT_OF_STOCK" : "PRODUCT_LOW_STOCK",
      category: "inventory",
      entityType: "Product",
      entityId: product._id,
      link: "/dashboard/products",
      priority: out ? "urgent" : "high",
      eventKey: `${out ? "OUT_OF_STOCK" : "LOW_STOCK"}:${product._id}:${product.stock}:${new Date(product.updatedAt).getTime()}`,
    });
  }));
}

export async function notifyInventoryFailure(input: {
  productId: string | mongoose.Types.ObjectId;
  eventId: string;
}) {
  const product = await Product.findById(input.productId).select("title").lean();
  await notifyAdmins({
    title: "خطا به‌دلیل کمبود موجودی",
    message: `ثبت سفارش به‌دلیل کافی نبودن موجودی «${product?.title || "محصول"}» متوقف شد.`,
    type: "PRODUCT_OUT_OF_STOCK",
    category: "inventory",
    entityType: "Product",
    entityId: input.productId,
    link: "/dashboard/products",
    priority: "urgent",
    eventKey: `INVENTORY_FAILURE:${input.eventId}:${input.productId}`,
  });
}
