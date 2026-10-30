import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import StoreOrder from "@/model/StoreOrder";
import moment from "moment-jalaali";
import "@/model/Customer";
import { deliverBusinessSms } from "@/lib/sms/business";
import { storeOrder } from "@/types";
import Customer from "@/model/Customer";
import mongoose from "mongoose";

moment.loadPersian({ usePersianDigits: false });

// ====================== FUNCTIONS ======================
const normalizeOrderList = (value: unknown): string[] => {
  if (!value) return [];

  const collect = (entry: unknown): string[] => {
    if (Array.isArray(entry)) {
      return entry.flatMap(collect);
    }

    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.flatMap(collect);
      } catch {
        // noop
      }

      return [trimmed];
    }

    return [String(entry).trim()].filter(Boolean);
  };

  return collect(value);
};
// تبدیل اعداد
const toPersianDigits = (str: string) =>
  str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

// نام کنسول
function getPersianConsoleName(consoleType?: string) {
  if (!consoleType) return "";
  if (consoleType === "ps4" || consoleType === "copy") return "پلی استیشن ۴";
  if (consoleType === "ps5") return "پلی استیشن ۵";
  if (consoleType === "ps5Copy") return "پلی استیشن ۵";
  if (consoleType === "xbox") return "ایکس باکس";
  return consoleType;
}

/* ================= GET ================= */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  if (session.user.role !== "superadmin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  await dbConnect();

  const orders = await StoreOrder.find({
    deliveryStatus: { $ne: "تحویل به مشتری" },
  })
    .populate("customer")
    .lean();

  const parsedOrders: storeOrder[] = orders.map((o: any) => ({
    ...o,
    deliveryStatus: o.deliveryStatus || "دریافت از مشتری",
    consoleType: (o.consoleType || "") as storeOrder["consoleType"],
  }));

  const groupedOrders: Record<string, storeOrder[]> = {};

  parsedOrders.forEach((order) => {
    const key = order.consoleType;
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
    const persianDate = moment().format("jYYYY/jMM/jDD HH:mm");

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

    const order = await StoreOrder.create({
      list,
      price,
      customer: customerId,
      description,
      consoleType,
      deliveryStatus: deliveryStatus || "دریافت از مشتری",
      clientRequestKey,
    });
    await order.populate("customer");
    // سفارش در این نقطه با موفقیت نهایی شده است؛ خطای پیامک آن را برنمی‌گرداند.
    const [datePart, timePart] = persianDate.split(" ");
    const sms = await deliverBusinessSms({
      eventKey: `STORE_ORDER_CREATED:${order._id}`,
      eventType: "STORE_ORDER_CREATED",
      entityType: "StoreOrder",
      entityId: order._id.toString(),
      bodyId: 323165,
      to: customer.mobile,
      args: [
        customer.sex === "مرد" ? "جناب آقای" : "سرکار خانم",
        customer.lastName,
        getPersianConsoleName(consoleType),
        toPersianDigits(datePart),
        toPersianDigits(timePart),
      ],
    }).catch(() => ({
      eventKey: `STORE_ORDER_CREATED:${order._id}`,
      state: "failed" as const,
      providerStatus: null,
      errorCode: "OUTBOX_UNAVAILABLE",
    }));

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
