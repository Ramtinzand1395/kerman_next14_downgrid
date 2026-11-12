import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import Appointment from "@/model/Appointment";
import { websiteStoreOrders } from "@/lib/appointments/store-order";
import StoreOrder from "@/model/StoreOrder";
import { sendStoreOrderReceiptSms } from "@/lib/sms/store-order";
import { storeOrder } from "@/types";
import Customer from "@/model/Customer";
import mongoose, { type ClientSession } from "mongoose";
import User from "@/model/User";
import { provisionStoreCustomerAccount } from "@/lib/store-customer-account";

/* ================= GET ================= */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  if (session.user.role !== "superadmin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  await dbConnect();

  const [orders, websiteOrders] = await Promise.all([
    StoreOrder.find({ deliveryStatus: { $ne: "تحویل به مشتری" } }).populate("customer").lean(),
    Appointment.aggregate<storeOrder>(websiteStoreOrders(true)),
  ]);

  const parsedOrders: storeOrder[] = orders.map((o: any) => ({
    ...o,
    deliveryStatus: o.deliveryStatus || "دریافت از مشتری",
    consoleType: (o.consoleType || "") as storeOrder["consoleType"],
  }));

  const groupedOrders: Record<string, storeOrder[]> = {};

  [...parsedOrders, ...websiteOrders].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))).forEach((order) => {
    const key = ["ps5", "ps4", "copy", "ps5Copy", "xbox"].includes(order.consoleType) ? order.consoleType : "other";
    if (!groupedOrders[key]) groupedOrders[key] = [];
    groupedOrders[key].push(order);
  });

  return NextResponse.json(groupedOrders);
}

/* ================= POST ================= */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  if (session.user.role !== "superadmin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  await dbConnect();

  let clientRequestKey = "";
  try {
    const body = await req.json();
    const { list, price, customerId, description, consoleType, deliveryStatus } =
      body;
    clientRequestKey = req.headers.get("Idempotency-Key")?.trim() || "";

    if (!/^[a-zA-Z0-9:_-]{16,128}$/.test(clientRequestKey)) {
      return NextResponse.json({ error: "کلید یکتای درخواست معتبر نیست" }, { status: 400 });
    }

    const replay = await StoreOrder.findOne({ clientRequestKey }).populate("customer");
    if (replay) {
      return NextResponse.json({
        message: "سفارش قبلاً ثبت شده است.",
        order: replay,
        replayed: true,
        sms: null,
      });
    }

    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json(
        { error: "حداقل یک بازی باید انتخاب شود" },
        { status: 400 },
      );
    }
    if (
      list.some(
        (item) =>
          !item ||
          typeof item.name !== "string" ||
          !item.name.trim() ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0 ||
          !Number.isFinite(Number(item.size)) ||
          Number(item.size) < 0,
      )
    ) {
      return NextResponse.json({ error: "فهرست بازی‌ها معتبر نیست" }, { status: 422 });
    }
    if (!Number.isSafeInteger(Number(price)) || Number(price) <= 0) {
      return NextResponse.json({ error: "قیمت نهایی سفارش معتبر نیست" }, { status: 422 });
    }
    if (!["ps4", "ps5", "copy", "xbox", "ps5Copy"].includes(consoleType)) {
      return NextResponse.json({ error: "نوع دستگاه معتبر نیست" }, { status: 422 });
    }
    if (
      deliveryStatus &&
      !["دریافت از مشتری", "آماده", "تحویل به مشتری"].includes(deliveryStatus)
    ) {
      return NextResponse.json({ error: "وضعیت تحویل معتبر نیست" }, { status: 422 });
    }
    if (description && (typeof description !== "string" || description.length > 1000)) {
      return NextResponse.json({ error: "توضیحات سفارش معتبر نیست" }, { status: 422 });
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "مشتری انتخاب نشده است" },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(String(customerId))) {
      return NextResponse.json({ error: "شناسه مشتری معتبر نیست" }, { status: 400 });
    }
    const customer = await Customer.findById(customerId).lean();
    if (!customer?.mobile) {
      return NextResponse.json({ error: "مشتری معتبر پیدا نشد" }, { status: 404 });
    }

    // The mobile index is required to arbitrate concurrent orders and first sign-ins.
    await User.init();
    const saveOrder = async (dbSession: ClientSession) => {
      await provisionStoreCustomerAccount(customer, dbSession);
      return new StoreOrder({
        list,
        price,
        customer: customerId,
        description,
        consoleType,
        deliveryStatus: deliveryStatus || "دریافت از مشتری",
        clientRequestKey,
      }).save({ session: dbSession });
    };
    const order = await mongoose.connection.transaction(saveOrder).catch((error: {
      code?: number;
      keyPattern?: { mobile?: number };
    }) => {
      // If OTP registration or another order inserted the same mobile, retry on the existing account.
      if (error?.code === 11000 && error.keyPattern?.mobile) {
        return mongoose.connection.transaction(saveOrder);
      }
      throw error;
    });
    order.$session(null);
    await order.populate("customer");
    // سفارش در این نقطه با موفقیت نهایی شده است؛ خطای پیامک آن را برنمی‌گرداند.
    const sms = await sendStoreOrderReceiptSms({
      entityType: "StoreOrder",
      id: order._id.toString(),
      mobile: customer.mobile,
      lastName: customer.lastName,
      sex: customer.sex,
      consoleType,
      registeredAt: order.createdAt,
    });

    return NextResponse.json(
      { message: "سفارش ایجاد شد.", order, sms },
      { status: 201 },
    );
  } catch (err) {
    if ((err as { code?: number })?.code === 11000 && clientRequestKey) {
      const replay = await StoreOrder.findOne({ clientRequestKey }).populate("customer");
      if (replay) {
        return NextResponse.json({
          message: "سفارش قبلاً ثبت شده است.",
          order: replay,
          replayed: true,
          sms: null,
        });
      }
    }
    console.error("POST /api/admin/store-order error:", err);
    return NextResponse.json(
      { error: "سفارش ثبت نشد؛ اطلاعات را بررسی و دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
