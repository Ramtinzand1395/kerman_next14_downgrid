// import TempPayment from "@/model/TempPayment";
// import Order from "@/model/Order";
// import { getServerSession } from "next-auth";
// import { NextRequest, NextResponse } from "next/server";
// import { authOptions } from "../../auth/[...nextauth]/options";
// import dbConnect from "@/lib/mongodb";
// import mongoose from "mongoose"

// function getBaseUrl(req: NextRequest) {
//   const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
//   if (envBaseUrl) {
//     return envBaseUrl.replace(/\/$/, "");
//   }

//   const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
//   const protocol = req.headers.get("x-forwarded-proto") ?? "https";

//   if (!host) {
//     return "https://kermanatari.ir";
//   }

//   return `${protocol}://${host}`;
// }

// export async function POST(req: NextRequest) {
//   await dbConnect();
//   const session = await getServerSession(authOptions);
//   if (!session)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   try {
//     const { orderId } = await req.json();

//     if (!orderId) {
//       return NextResponse.json(
//         { success: false, error: "شناسه سفارش نامعتبر است" },
//         { status: 400 },
//       );
//     }

//     if (!mongoose.isValidObjectId(orderId)) {
//       return NextResponse.json(
//         { success: false, error: "شناسه سفارش معتبر نیست" },
//         { status: 400 },
//       );
//     }

//     const order = await Order.findOne({
//       _id: orderId,
//       user: session.user.id,
//     }).lean();

//     if (!order) {
//       return NextResponse.json(
//         { success: false, error: "سفارش پیدا نشد" },
//         { status: 404 },
//       );
//     }

//     if (order.paymentStatus === "paid") {
//       return NextResponse.json(
//         { success: false, error: "این سفارش قبلاً پرداخت شده است" },
//         { status: 409 },
//       );
//     }

//     const description = "پرداخت سفارش کلاس";
//     const merchant_id = process.env.ZARINPAL_MERCHANT_ID;
//     const callback_url = `${getBaseUrl(req)}/api/payment-zarinpal/verify`;
//     const finalPriceWithExtraZero = order.finalPrice * 10;

//     const res = await fetch(
//       // "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
//       "https://api.zarinpal.com/pg/v4/payment/request.json",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           merchant_id,
//           amount: finalPriceWithExtraZero,
//           description,
//           callback_url,
//         }),
//       },
//     );

//     const result = await res.json();

//     if (result.data && result.data.code === 100) {
//       const authority = result.data.authority;

//       // ✔ ذخیره در MongoDB
//       await TempPayment.create({
//         authority,
//         userId: session.user.id,
//         items: order.items.map(
//           (item: { product: string; quantity: number }) => ({
//             product: item.product,
//             quantity: item.quantity,
//           }),
//         ),
//         finalPrice: finalPriceWithExtraZero,
//         orderId,
//       });

//       return NextResponse.json({
//         success: true,
//         url: `https://api.zarinpal.com/pg/StartPay/${authority}`,
//       });
//     } else {
//       return NextResponse.json(
//         {
//           success: false,
//           error: result.errors?.message || "خطا در ایجاد پرداخت",
//         },
//         { status: 500 },
//       );
//     }
//   } catch (err: unknown) {
//     let errorMessage = "خطا در سرور";
//     if (err instanceof Error) {
//       errorMessage = err.message;
//     }

//     return NextResponse.json(
//       { success: false, error: errorMessage },
//       { status: 500 },
//     );
//   }
// }

import TempPayment from "@/model/TempPayment";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

function getBaseUrl(req: NextRequest) {
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl) return envBaseUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  if (!host) return "https://kermanatari.ir";
  return `${proto}://${host}`;
}

type ZarinpalResponse = {
  data?: {
    code?: number;
    authority?: string;
    message?: string;
  };
  errors?: {
    code?: number;
    message?: string;
    validations?: Record<string, string[]>;
  };
};

export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return NextResponse.json(
        { success: false, error: "شناسه سفارش نامعتبر است" },
        { status: 400 }
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      user: session.user.id,
    }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "سفارش پیدا نشد" },
        { status: 404 }
      );
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "این سفارش قبلاً پرداخت شده است" },
        { status: 409 }
      );
    }

    const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant_id) {
      return NextResponse.json(
        { success: false, error: "Merchant ID تنظیم نشده است" },
        { status: 500 }
      );
    }

    const callback_url = `${getBaseUrl(req)}/api/payment-zarinpal/verify`;
    const description = "پرداخت سفارش";

    // اگر قیمت به تومان ذخیره شده → ضربدر 10
    const amount = Number(order.finalPrice) * 10;

    if (!Number.isFinite(amount) || amount < 10000) {
      return NextResponse.json(
        { success: false, error: "مبلغ پرداخت نامعتبر است" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://payment.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount,
          description,
          callback_url,
        }),
        cache: "no-store",
      }
    );

    const result = (await response.json()) as ZarinpalResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result?.errors?.message || "خطا در ارتباط با زرین‌پال",
        },
        { status: 502 }
      );
    }

    if (result.data?.code === 100 && result.data.authority) {
      const authority = result.data.authority;

      await TempPayment.findOneAndUpdate(
        { orderId, userId: session.user.id },
        {
          authority,
          userId: session.user.id,
          items: order.items,
          finalPrice: amount,
          orderId,
          updatedAt: new Date(),
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        authority,
        url: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          result?.errors?.message ||
          result?.data?.message ||
          "خطا در ایجاد پرداخت",
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطا در سرور";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}