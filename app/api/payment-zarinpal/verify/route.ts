import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import User from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/baseUrl";

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

  const baseUrl = getSiteUrl();
  const { searchParams } = new URL(req.url);

  const authority =
    searchParams.get("Authority") ?? searchParams.get("authority") ?? "";
  const status = searchParams.get("Status") ?? searchParams.get("status") ?? "";
  const retried = searchParams.get("retried") ?? "";

  const failedUrl = withPaymentQuery(baseUrl, "/payment-failed", {
    authority,
    status,
    retried: retried === "1" ? "1" : undefined,
  });

  const pendingUrl = withPaymentQuery(baseUrl, "/payment-pending", {
    authority,
  });

  try {
    if (!authority || status !== "OK") {
      if (authority) {
        await TempPayment.findOneAndUpdate(
          { authority },
          { $set: { status: "failed", failedAt: new Date() } },
        );
      }
      return NextResponse.redirect(failedUrl);
    }

    const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant_id) return NextResponse.redirect(failedUrl);

    const alreadyPaidOrder = await Order.findOne({
      paymentAuthority: authority,
      paymentStatus: { $in: ["paid", "pending_refund"] },
    }).lean();

    if (alreadyPaidOrder) {
      const successPath =
        alreadyPaidOrder.paymentStatus === "pending_refund"
          ? "/payment-pending"
          : "/payment-success";

      await TempPayment.deleteOne({ authority });

      const successUrl = withPaymentQuery(baseUrl, successPath, {
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
      await TempPayment.findOneAndUpdate(
        { authority },
        { $set: { status: "failed", failedAt: new Date() } },
      );
      return NextResponse.redirect(failedUrl);
    }

    const duplicateOrder = await Order.findOne({
      paymentAuthority: authority,
      paymentStatus: { $in: ["paid", "pending_refund"] },
    }).lean();

    if (duplicateOrder) {
      await TempPayment.deleteOne({ authority });

      const successPath =
        duplicateOrder.paymentStatus === "pending_refund"
          ? "/payment-pending"
          : "/payment-success";

      const duplicateUrl = withPaymentQuery(baseUrl, successPath, {
        orderId: duplicateOrder._id.toString(),
        authority,
        refId: duplicateOrder.paymentRefId,
      });

      return NextResponse.redirect(duplicateUrl);
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
        );

        if (!updated) {
          await TempPayment.findOneAndUpdate(
            { authority },
            { $set: { status: "failed", failedAt: new Date() } },
          );
          return NextResponse.redirect(failedUrl);
        }
        continue;
      }

      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );

      if (!updated) {
        await TempPayment.findOneAndUpdate(
          { authority },
          { $set: { status: "failed", failedAt: new Date() } },
        );
        return NextResponse.redirect(failedUrl);
      }
    }

    const order = await Order.create({
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
    });

    await User.findByIdAndUpdate(temp.userId, { $push: { orders: order._id } });

    await Notification.create({
      title: "سفارش جدید",
      message: "یک سفارش جدید ثبت شد",
      type: "order",
      target: {
        kind: "Order",
        item: order._id,
      },
    });

    await TempPayment.deleteOne({ authority });

    const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
      orderId: order._id.toString(),
      authority,
      refId: result?.data?.ref_id,
    });

    console.info(
      JSON.stringify({
        event: "payment.verify.completed",
        authority,
        orderId: order._id.toString(),
      }),
    );

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(pendingUrl);
  }
}
