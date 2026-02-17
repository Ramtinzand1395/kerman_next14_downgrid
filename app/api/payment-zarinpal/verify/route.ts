// pages/api/payment-zarinpal/verify.js
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    // اگر پرداخت لغو شده بود
    if (status !== "OK") {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`);
    }

    // گرفتن پرداخت موقت
    const temp = await TempPayment.findOne({ authority }).lean();
    if (!temp) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`);
    }

    const {  finalPrice, items, orderId } = temp;

    // ارسال درخواست تایید به زرین پال
    // sand
    const verifyRes = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: process.env.ZARINPAL_MERCHANT_ID,
          amount: finalPrice,
          authority,
        }),
      }
    );

    const result = await verifyRes.json();

    if (result.data && result.data.code === 100) {
      // ساخت سفارش
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
      });

      // کاهش موجودی محصولات
      await Promise.all(
        items.map(async (productId: string) => {
          await Product.findByIdAndUpdate(productId, {
            $inc: { stock: -1 },
          });
        })
      );

      // حذف پرداخت موقت
      await TempPayment.deleteOne({ authority });

      // ریدایرکت به صفحه موفقیت
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`);
    }

    // در صورت عدم تایید پرداخت
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`);
  }
}
