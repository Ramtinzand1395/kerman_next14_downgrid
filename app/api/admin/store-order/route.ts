import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import StoreOrder from "@/model/StoreOrder";
import moment from "moment-jalaali";
import "@/model/Customer";
import senSMS from "@/helpers/CustomerSms";
import { storeOrder } from "@/types";

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

  const body = await req.json();
  const { list, price, customerId, description, consoleType, deliveryStatus } =
    body;
  const persianDate = moment().format("jYYYY/jMM/jDD HH:mm");

  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json(
      { error: "حداقل یک بازی باید انتخاب شود" },
      { status: 400 },
    );
  }

  const order = await StoreOrder.create({
    list,
    price,
    customer: customerId,
    description,
    consoleType,
    deliveryStatus: deliveryStatus || "دریافت از مشتری",
  });

  await order.populate("customer");
  // ارسال پیامک
  const [datePart, timePart] = persianDate.split(" ");
  const customer = order.customer;

  let smsResponse = null;

  smsResponse = await senSMS({
    bodyId: 323165,
    // bodyId: 323167,
    to: customer.mobile,
    args: [
      customer.sex === "مرد" ? "جناب آقای" : "سرکار خانم",
      customer.lastName,
      getPersianConsoleName(consoleType),
      toPersianDigits(datePart),
      toPersianDigits(timePart),
    ],
  });
  return NextResponse.json(
    { message: "سفارش ایجاد شد.", order, sms: smsResponse },
    { status: 201 },
  );
}
