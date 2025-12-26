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

// تبدیل اعداد
const toPersianDigits = (str: string) =>
  str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

// نام کنسول
function getPersianConsoleName(consoleType?: string) {
  if (!consoleType) return "";
  if (consoleType === "ps4" || consoleType === "copy") return "پلی استیشن ۴";
  if (consoleType === "ps5") return "پلی استیشن ۵";
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

  const parsedOrders = orders.map((o: storeOrder) => ({
    ...o,
    // list: JSON.parse(o.list),
    deliveryStatus: o.deliveryStatus || "دریافت از مشتری",
    consoleType: o.consoleType || "unknown",
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
// todo
// اگه smsنرفت سفارش حذف بشه
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

  const order = await StoreOrder.create({
    list: JSON.stringify(list),
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
    { status: 201 }
  );
}
