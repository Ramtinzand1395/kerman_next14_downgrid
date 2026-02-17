import TempPayment from "@/model/TempPayment";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId, items, finalPrice } = await req.json();

    const description = "پرداخت سفارش کلاس";
    const merchant_id = process.env.ZARINPAL_MERCHANT_ID;
    const callback_url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-zarinpal/verify`;
    const finalPriceWithExtraZero = finalPrice * 10;
    // !sandbox
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
      }
    );

    const result = await res.json();

    if (result.data && result.data.code === 100) {
      const authority = result.data.authority;

      // ✔ ذخیره در MongoDB
      await TempPayment.create({
        authority,
        userId: session.user.id,
        items,
        finalPrice: finalPriceWithExtraZero,
        orderId,
      });
// !sand
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
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    let errorMessage = "خطا در سرور";
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
