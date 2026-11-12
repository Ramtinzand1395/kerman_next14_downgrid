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
import { provisionStoreCustomerAccount, storeCustomerMobile } from "@/lib/store-customer-account";

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

type MongoWriteError = {
  code?: number;
  message?: string;
  keyPattern?: { mobile?: number };
  cause?: MongoWriteError;
  originalError?: MongoWriteError;
};

function transactionsUnavailable(error: MongoWriteError) {
  return [error, error?.cause, error?.originalError].some((failure) =>
    failure?.code === 20 &&
    failure.message?.includes("Transaction numbers are only allowed on a replica set member or mongos"),
  );
}

type SavedOrder = InstanceType<typeof StoreOrder>;
type OrderCustomer = { mobile: string; name?: string; lastName: string; sex?: string };

async function respondToSavedOrder(order: SavedOrder, customer: OrderCustomer | null, replayed = false) {
  const response = {
    message: replayed ? "سفارش قبلاً ثبت شده است." : "سفارش ایجاد شد.",
    order,
    ...(replayed ? { replayed: true } : {}),
  };
  const syncPending = order.websiteAccountSyncPending === true;
  const needsAccountSync = syncPending || replayed;
  try {
    if (needsAccountSync) {
      if (!customer?.mobile || !storeCustomerMobile(customer.mobile)) {
        return NextResponse.json({
          error: "سفارش ذخیره شده است. شماره موبایل مشتری را در بخش مدیریت مشتریان اصلاح کنید.",
        }, { status: 422 });
      }
      await User.init();
      await provisionStoreCustomerAccount(customer);
      if (!syncPending) return NextResponse.json({ ...response, sms: null });
    }

    const sms = customer ? await sendStoreOrderReceiptSms({
      entityType: "StoreOrder",
      id: order._id.toString(),
      mobile: customer.mobile,
      lastName: customer.lastName,
      sex: customer.sex,
      consoleType: order.consoleType,
      registeredAt: order.createdAt,
    }) : null;

    if (syncPending) {
      await StoreOrder.updateOne({ _id: order._id }, { $unset: { websiteAccountSyncPending: 1 } });
      order.websiteAccountSyncPending = undefined;
    }
    return NextResponse.json({ ...response, sms }, { status: replayed ? 200 : 201 });
  } catch (error) {
    if (!needsAccountSync) throw error;
    console.error("[store-order] could not finish website account sync", error);
    return NextResponse.json({
      error: "سفارش ذخیره شد. برای تکمیل ثبت حساب مشتری، دوباره روی «ثبت سفارش» بزنید.",
    }, { status: 503 });
  }
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
    if (replay) return respondToSavedOrder(replay, replay.customer, true);

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

    if (!storeCustomerMobile(customer.mobile)) {
      return NextResponse.json({ error: "شماره موبایل مشتری را در بخش مدیریت مشتریان اصلاح کنید." }, { status: 422 });
    }

    // The mobile index is required to arbitrate concurrent orders and first sign-ins.
    await User.init();
    await StoreOrder.init();
    const orderData = {
      list,
      price,
      customer: customerId,
      description,
      consoleType,
      deliveryStatus: deliveryStatus || "دریافت از مشتری",
      clientRequestKey,
    };
    const saveOrder = async (dbSession: ClientSession) => {
      await provisionStoreCustomerAccount(customer, dbSession);
      return new StoreOrder(orderData).save({ session: dbSession });
    };
    const writeWithTransaction = () => mongoose.connection.transaction(saveOrder);
    const order = await writeWithTransaction()
      .catch((error: MongoWriteError) => {
        if (error?.code === 11000 && error.keyPattern?.mobile) return writeWithTransaction();
        throw error;
      })
      .catch((error: MongoWriteError) => {
        if (!transactionsUnavailable(error)) throw error;
        // Persist the order before provisioning so a rejected order cannot leave an orphan account.
        // The order's idempotency key can resume provisioning if a subsequent write fails.
        return new StoreOrder({ ...orderData, websiteAccountSyncPending: true }).save();
      });

    order.$session(null);
    await order.populate("customer");
    return await respondToSavedOrder(order, customer);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000 && clientRequestKey) {
      const replay = await StoreOrder.findOne({ clientRequestKey }).populate("customer");
      if (replay) return respondToSavedOrder(replay, replay.customer, true);
    }
    console.error("POST /api/admin/store-order error:", err);
    return NextResponse.json(
      { error: "سفارش ثبت نشد؛ اطلاعات را بررسی و دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
