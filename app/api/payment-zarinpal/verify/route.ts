import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import User from "@/model/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

function getBaseUrl(req: NextRequest) {
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl) return envBaseUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  if (!host) return "https://kermanatari.ir";
  return `${proto}://${host}`;
}

type ZarinpalVerifyResponse = {
  data?: {
    code?: number;
    ref_id?: number;
    card_pan?: string;
    fee_type?: string;
    fee?: number;
  };
};

function withPaymentQuery(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function GET(req: NextRequest) {
  await dbConnect();

  const baseUrl = getBaseUrl(req);
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("Authority") ?? "";
  const status = searchParams.get("Status") ?? "";

  const failedUrl = withPaymentQuery(baseUrl, "/payment-failed", {
    authority,
    status,
  });

  try {
    if (!authority || status !== "OK") {
      if (authority) await TempPayment.deleteOne({ authority });
      return NextResponse.redirect(failedUrl);
    }

    const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant_id) return NextResponse.redirect(failedUrl);

    const alreadyPaidOrder = await Order.findOne({
      paymentAuthority: authority,
      paymentStatus: "paid",
    }).lean();

    if (alreadyPaidOrder) {
      const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
        orderId: alreadyPaidOrder._id?.toString(),
        authority,
        refId: alreadyPaidOrder.paymentRefId,
      });
      return NextResponse.redirect(successUrl);
    }

    const temp = await TempPayment.findOne({ authority }).lean();
    if (!temp) return NextResponse.redirect(failedUrl);

    const verifyRes = await fetch(
      "https://payment.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount: temp.gatewayAmount,
          authority,
        }),
        cache: "no-store",
      },
    );

    const result = (await verifyRes.json()) as ZarinpalVerifyResponse;
    const code = result?.data?.code;

    if (!verifyRes.ok || (code !== 100 && code !== 101)) {
      return NextResponse.redirect(failedUrl);
    }

    const session = await mongoose.startSession();
    let createdOrderId = "";

    try {
      await session.withTransaction(async () => {
        const duplicateOrder = await Order.findOne({
          paymentAuthority: authority,
          paymentStatus: "paid",
        }).session(session);

        if (duplicateOrder) {
          createdOrderId = duplicateOrder._id.toString();
          await TempPayment.deleteOne({ authority }).session(session);
          return;
        }

        for (const item of temp.items as Array<{
          product: string;
          variantId?: string;
          quantity: number;
        }>) {
          if (item.variantId) {
            const updated = await Product.findOneAndUpdate(
              {
                _id: item.product,
                stock: { $gte: item.quantity },
                variants: {
                  $elemMatch: {
                    _id: item.variantId,
                    stock: { $gte: item.quantity },
                  },
                },
              },
              {
                $inc: {
                  stock: -item.quantity,
                  "variants.$.stock": -item.quantity,
                },
              },
              { session },
            );

            if (!updated) throw new Error("OUT_OF_STOCK");
            continue;
          }

          const updated = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session },
          );

          if (!updated) throw new Error("OUT_OF_STOCK");
        }

        const order = await Order.create(
          [
            {
              user: temp.userId,
              address: temp.address,
              items: temp.items,
              totalPrice: temp.totalPrice,
              shippingCost: temp.shippingCost,
              finalPrice: temp.finalPrice,
              paymentStatus: "paid",
              paymentGateway: "zarinpal",
              paymentAuthority: authority,
              paymentRefId: result?.data?.ref_id ?? null,
              paymentCardPan: result?.data?.card_pan ?? null,
              paymentFeeType: result?.data?.fee_type ?? null,
              paymentFee: result?.data?.fee ?? null,
              paymentVerifiedAt: new Date(),
            },
          ],
          { session },
        );

        createdOrderId = order[0]._id.toString();

        await User.findByIdAndUpdate(
          temp.userId,
          { $push: { orders: order[0]._id } },
          { session },
        );

        await Notification.create(
          [
            {
              title: "سفارش جدید",
              message: "یک سفارش جدید ثبت شد",
              type: "order",
              target: {
                kind: "Order",
                item: order[0]._id,
              },
            },
          ],
          { session },
        );

        await TempPayment.deleteOne({ authority }).session(session);
      });
    } finally {
      await session.endSession();
    }

    const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
      orderId: createdOrderId,
      authority,
      refId: result?.data?.ref_id,
    });

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(failedUrl);
  }
}