import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import Appointment from "@/model/Appointment";
import { websiteStoreOrders } from "@/lib/appointments/store-order";
import StoreOrder from "@/model/StoreOrder";
import { sendStoreOrderReceiptSms } from "@/lib/sms/store-order";
import { ensureStoreOrderPrintJob } from "@/lib/print/queue";
import { buildPrintPayload } from "@/lib/print/store-order-payload";
import { storeOrder } from "@/types";
import {
  findStoreCustomer, storeCustomerMobile, storeCustomerSnapshot,
  storeSmsName, toStoreCustomer,
} from "@/lib/store-customer-account";
import { storeOrderCustomerJoin } from "@/lib/store-order-identity";
import { isCustomerDuplicateKey } from "@/lib/store-customer-barcodes";

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
    StoreOrder.aggregate<storeOrder>([
      { $match: { deliveryStatus: { $ne: "تحویل به مشتری" } } },
      ...storeOrderCustomerJoin(),
    ]),
    Appointment.aggregate(websiteStoreOrders(true)),
  ]);

  const parsedOrders: storeOrder[] = [...orders, ...websiteOrders].map((o: any) => ({
    ...o,
    customer: o.customer ? toStoreCustomer(o.customer) : undefined,
    deliveryStatus: o.deliveryStatus || "دریافت از مشتری",
    consoleType: (o.consoleType || "") as storeOrder["consoleType"],
  }));

  const groupedOrders: Record<string, storeOrder[]> = {};

  parsedOrders.sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))).forEach((order) => {
    const key = ["ps5", "ps4", "copy", "ps5Copy", "xbox"].includes(order.consoleType) ? order.consoleType : "other";
    if (!groupedOrders[key]) groupedOrders[key] = [];
    groupedOrders[key].push(order);
  });

  return NextResponse.json(groupedOrders);
}

type SavedOrder = InstanceType<typeof StoreOrder>;
type OrderCustomer = ReturnType<typeof toStoreCustomer>;

async function queueReceipt(order: SavedOrder, customer: OrderCustomer | null, actorId: string) {
  try {
    await ensureStoreOrderPrintJob(
      order._id.toString(),
      buildPrintPayload(order, order.customerSnapshot ?? customer, "Asia/Tehran"),
      actorId,
    );
    return "queued";
  } catch (error) {
    console.error("[store-order] could not queue automatic receipt", error);
    return "failed";
  }
}

async function respondToSavedOrder(
  order: SavedOrder,
  customer: OrderCustomer | null,
  actorId: string,
  replayed = false,
) {
  const mobile = storeCustomerMobile(customer?.mobile);
  const printStatus = await queueReceipt(order, customer, actorId);
  const sms = customer && mobile && !replayed ? await sendStoreOrderReceiptSms({
    entityType: "StoreOrder",
    id: order._id.toString(),
    mobile,
    lastName: storeSmsName(customer),
    sex: customer.sex,
    consoleType: order.consoleType,
    registeredAt: order.createdAt,
  }) : null;
  return NextResponse.json({
    message: replayed ? "سفارش قبلاً ثبت شده است." : "سفارش ایجاد شد.",
    order: { ...order.toObject(), customer },
    ...(replayed ? { replayed: true } : {}),
    sms,
    printStatus,
  }, { status: replayed ? 200 : 201 });
}

async function respondToReplay(order: SavedOrder, actorId: string) {
  const owner = await findStoreCustomer(String(order.userId ?? order.customer ?? ""));
  return respondToSavedOrder(order, owner ? toStoreCustomer(owner) : null, actorId, true);
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
    const { list, price, customerId, description, consoleType, deliveryStatus, isLegal } =
      body;
    clientRequestKey = req.headers.get("Idempotency-Key")?.trim() || "";

    if (!/^[a-zA-Z0-9:_-]{16,128}$/.test(clientRequestKey)) {
      return NextResponse.json({ error: "کلید یکتای درخواست معتبر نیست" }, { status: 400 });
    }

    const replay = await StoreOrder.findOne({ clientRequestKey });
    if (replay) return respondToReplay(replay, session.user.id);

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
    if (isLegal !== undefined && typeof isLegal !== "boolean") {
      return NextResponse.json({ error: "وضعیت قانونی بودن بازی معتبر نیست" }, { status: 422 });
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

    const owner = await findStoreCustomer(customerId);
    if (!owner || !storeCustomerMobile(owner.mobile)) {
      return NextResponse.json({ error: "مشتری معتبر پیدا نشد" }, { status: 404 });
    }
    const customer = toStoreCustomer(owner);

    await StoreOrder.init();
    const order = await StoreOrder.create({
      list,
      price,
      userId: owner._id,
      customerSnapshot: storeCustomerSnapshot(customer),
      description,
      consoleType,
      isLegal: isLegal === true,
      deliveryStatus: deliveryStatus || "دریافت از مشتری",
      clientRequestKey,
    });
    return await respondToSavedOrder(order, customer, session.user.id);
  } catch (error) {
    if (clientRequestKey && isCustomerDuplicateKey(error)) {
      const replay = await StoreOrder.findOne({ clientRequestKey });
      if (replay) return respondToReplay(replay, session.user.id);
    }
    console.error("[store-order] save failed", error instanceof Error ? error.name : typeof error);
    return NextResponse.json(
      { error: "سفارش ثبت نشد؛ اطلاعات را بررسی و دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
