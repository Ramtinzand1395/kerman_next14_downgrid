import { NextRequest, NextResponse } from "next/server";
import moment from "moment-jalaali";
import { deliverBusinessSms } from "@/lib/sms/business";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import StoreOrder from "@/model/StoreOrder";

moment.loadPersian({ usePersianDigits: false });

// Helper برای نام کنسول به فارسی
function getPersianConsoleName(consoleType?: string) {
  if (!consoleType) return "";
  if (consoleType === "ps4" || consoleType === "copy") return "پلی استیشن ۴";
  if (consoleType === "ps5") return "پلی استیشن ۵";
  if (consoleType.toLowerCase() === "xbox") return "ایکس باکس";
  return consoleType;
}

// Helper تبدیل اعداد به فارسی
function toPersianDigits(str: string) {
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

// (
//   req: NextRequest,
//   { params }: { params: Promise<{ orderId: string }> }
// )
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin" && session.user.role !== "admin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  await dbConnect();

  try {
    const { orderId } = await params;
    const body = await req.json();
    const { status, sendSms = true } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID invalid" },
        { status: 400 }
      );
    }

    const validStatuses = ["دریافت از مشتری", "آماده", "تحویل به مشتری"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ message: "وضعیت سفارش معتبر نیست." }, { status: 422 });
    }

    const existing = await StoreOrder.findById(orderId).populate("customer");

    if (!existing) {
      return NextResponse.json(
        { message: "سفارشی پیدا نشد." },
        { status: 404 }
      );
    }

    let deliveryDate: string | null = null;
    if (status === "تحویل به مشتری") {
      deliveryDate = moment().format("jYYYY/jMM/jDD HH:mm");
    }

    if (existing.deliveryStatus === status) {
      return NextResponse.json({
        message: "وضعیت سفارش قبلاً ثبت شده است.",
        data: existing,
        sms: null,
      });
    }

    const order = await StoreOrder.findOneAndUpdate(
      { _id: orderId, deliveryStatus: existing.deliveryStatus },
      {
        $set: {
          deliveryStatus: status,
          ...(deliveryDate ? { deliveryDate } : {}),
        },
      },
      { returnDocument: "after", runValidators: true },
    ).populate("customer");
    if (!order) {
      return NextResponse.json({ message: "وضعیت سفارش هم‌زمان تغییر کرده است." }, { status: 409 });
    }

    let smsResponse = null;

    if (sendSms && order.customer) {
      const persianConsole = getPersianConsoleName(order.consoleType);

      if (status === "آماده") {
        smsResponse = await deliverBusinessSms({
          eventKey: `STORE_ORDER_STATUS:${order._id}:READY`,
          eventType: "STORE_ORDER_READY",
          entityType: "StoreOrder",
          entityId: order._id.toString(),
          bodyId: 332452,
          to: order.customer.mobile,
          args: [
            order.customer.sex === "مرد" ? "جناب آقای" : "سرکار خانم",
            order.customer.lastName,
            toPersianDigits(order.deliveryCode),
          ],
        }).catch(() => ({
          eventKey: `STORE_ORDER_STATUS:${order._id}:READY`,
          state: "failed" as const,
          providerStatus: null,
          errorCode: "OUTBOX_UNAVAILABLE",
        }));
      }

      if (status === "تحویل به مشتری") {
        smsResponse = await deliverBusinessSms({
          eventKey: `STORE_ORDER_STATUS:${order._id}:DELIVERED`,
          eventType: "STORE_ORDER_DELIVERED",
          entityType: "StoreOrder",
          entityId: order._id.toString(),
          bodyId: 323178,
          to: order.customer.mobile,
          args: [
            order.customer.sex === "مرد" ? "جناب آقای" : "سرکار خانم",
            order.customer.lastName,
            persianConsole,
            toPersianDigits(deliveryDate || ""),
          ],
        }).catch(() => ({
          eventKey: `STORE_ORDER_STATUS:${order._id}:DELIVERED`,
          state: "failed" as const,
          providerStatus: null,
          errorCode: "OUTBOX_UNAVAILABLE",
        }));
      }
    }

    return NextResponse.json({
      message: "سفارش تغییر کرد.",
      data: order,
      sms: smsResponse,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "وضعیت سفارش تغییر نکرد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
