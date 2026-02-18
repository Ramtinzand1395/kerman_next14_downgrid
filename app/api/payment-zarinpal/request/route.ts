import TempPayment from "@/model/TempPayment";
import Order from "@/model/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "شناسه سفارش نامعتبر است" },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json(
        { success: false, error: "شناسه سفارش معتبر نیست" },
        { status: 400 },
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      user: session.user.id,
    }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "سفارش پیدا نشد" },
        { status: 404 },
      );
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "این سفارش قبلاً پرداخت شده است" },
        { status: 409 },
      );
    }

    const description = "پرداخت سفارش کلاس";
    const merchant_id = process.env.ZARINPAL_MERCHANT_ID;
    const callback_url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-zarinpal/verify`;
    const finalPriceWithExtraZero = order.finalPrice * 10;

    const res = await fetch(
      // "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
      "https://api.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount: finalPriceWithExtraZero,
          description,
          callback_url,
        }),
      },
    );

    const result = await res.json();

    if (result.data && result.data.code === 100) {
      const authority = result.data.authority;

      // ✔ ذخیره در MongoDB
      await TempPayment.create({
        authority,
        userId: session.user.id,
        items: order.items.map(
          (item: { product: string; quantity: number }) => ({
            product: item.product,
            quantity: item.quantity,
          }),
        ),
        finalPrice: finalPriceWithExtraZero,
        orderId,
      });

      return NextResponse.json({
        success: true,
        url: `https://api.zarinpal.com/pg/StartPay/${authority}`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.errors?.message || "خطا در ایجاد پرداخت",
        },
        { status: 500 },
      );
    }
  } catch (err: unknown) {
    let errorMessage = "خطا در سرور";
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
