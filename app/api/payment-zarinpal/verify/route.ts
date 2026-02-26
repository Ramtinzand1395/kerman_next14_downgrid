// import dbConnect from "@/lib/mongodb";
// import Notification from "@/model/Notification";
// import Order from "@/model/Order";
// import Product from "@/model/Product";
// import TempPayment from "@/model/TempPayment";
// import User from "@/model/User";
// import mongoose from "mongoose";
// import { NextRequest, NextResponse } from "next/server";

// function getBaseUrl(req: NextRequest) {
//   const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
//   if (envBaseUrl) return envBaseUrl.replace(/\/$/, "");

//   const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
//   const proto = req.headers.get("x-forwarded-proto") ?? "https";

//   if (!host) return "https://kermanatari.ir";
//   return `${proto}://${host}`;
// }

// type ZarinpalVerifyResponse = {
//   data?: {
//     code?: number;
//     ref_id?: number;
//     card_pan?: string;
//     fee_type?: string;
//     fee?: number;
//   };
// };

// function withPaymentQuery(
//   baseUrl: string,
//   path: string,
//   params: Record<string, string | number | undefined | null>,
// ) {
//   const url = new URL(`${baseUrl}${path}`);
//   for (const [key, value] of Object.entries(params)) {
//     if (value !== undefined && value !== null && value !== "") {
//       url.searchParams.set(key, String(value));
//     }
//   }
//   return url.toString();
// }

// export async function GET(req: NextRequest) {
//   await dbConnect();
//   console.log("verify");
//   const baseUrl = getBaseUrl(req);
//   const { searchParams } = new URL(req.url);
//   const authority =
//     searchParams.get("Authority") ?? searchParams.get("authority") ?? "";
//   const status = searchParams.get("Status") ?? searchParams.get("status") ?? "";
//   const retried = searchParams.get("retried") ?? "";

//   const failedUrl = withPaymentQuery(baseUrl, "/payment-failed", {
//     authority,
//     status,
//     retried: retried === "1" ? "1" : undefined,
//   });

//   try {
//     if (!authority || status !== "OK") {
//       console.log("veify", "NOK");
//       if (authority) await TempPayment.deleteOne({ authority });
//       return NextResponse.redirect(failedUrl);
//     }

//     const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
//     if (!merchant_id) return NextResponse.redirect(failedUrl);

//     const alreadyPaidOrder = await Order.findOne({
//       paymentAuthority: authority,
//       paymentStatus: "paid",
//     }).lean();

//     if (alreadyPaidOrder) {
//       const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
//         orderId: alreadyPaidOrder._id?.toString(),
//         authority,
//         refId: alreadyPaidOrder.paymentRefId,
//       });
//       console.log(successUrl, "successUrl");

//       return NextResponse.redirect(successUrl);
//     }

//     const temp = await TempPayment.findOne({ authority }).lean();
//     if (!temp) return NextResponse.redirect(failedUrl);

//     const verifyRes = await fetch(
//       "https://payment.zarinpal.com/pg/v4/payment/verify.json",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           merchant_id,
//           amount: temp.gatewayAmount,
//           authority,
//         }),
//         cache: "no-store",
//       },
//     );

//     const result = (await verifyRes.json()) as ZarinpalVerifyResponse;
//     console.log(result, "verifyRes");

//     const code = result?.data?.code;

//     if (!verifyRes.ok || (code !== 100 && code !== 101)) {
//       console.log(failedUrl, "failedUrl");

//       return NextResponse.redirect(failedUrl);
//     }

//     const session = await mongoose.startSession();
//     let createdOrderId = "";

//     try {
//       await session.withTransaction(async () => {
//         const duplicateOrder = await Order.findOne({
//           paymentAuthority: authority,
//           paymentStatus: "paid",
//         }).session(session);

//         if (duplicateOrder) {
//           createdOrderId = duplicateOrder._id.toString();
//           await TempPayment.deleteOne({ authority }).session(session);
//           return;
//         }

//         for (const item of temp.items as Array<{
//           product: string;
//           variantId?: string;
//           quantity: number;
//         }>) {
//           if (item.variantId) {
//             const updated = await Product.findOneAndUpdate(
//               {
//                 _id: item.product,
//                 stock: { $gte: item.quantity },
//                 variants: {
//                   $elemMatch: {
//                     _id: item.variantId,
//                     stock: { $gte: item.quantity },
//                   },
//                 },
//               },
//               {
//                 $inc: {
//                   stock: -item.quantity,
//                   "variants.$.stock": -item.quantity,
//                 },
//               },
//               { session },
//             );

//             if (!updated) throw new Error("OUT_OF_STOCK");
//             continue;
//           }

//           const updated = await Product.findOneAndUpdate(
//             { _id: item.product, stock: { $gte: item.quantity } },
//             { $inc: { stock: -item.quantity } },
//             { session },
//           );

//           if (!updated) throw new Error("OUT_OF_STOCK");
//         }

//         const order = await Order.create(
//           [
//             {
//               user: temp.userId,
//               address: temp.address,
//               items: temp.items,
//               totalPrice: temp.totalPrice,
//               shippingCost: temp.shippingCost,
//               finalPrice: temp.finalPrice,
//               paymentStatus: "paid",
//               paymentGateway: "zarinpal",
//               paymentAuthority: authority,
//               paymentRefId: result?.data?.ref_id ?? null,
//               paymentCardPan: result?.data?.card_pan ?? null,
//               paymentFeeType: result?.data?.fee_type ?? null,
//               paymentFee: result?.data?.fee ?? null,
//               paymentVerifiedAt: new Date(),
//             },
//           ],
//           { session },
//         );

//         createdOrderId = order[0]._id.toString();

//         await User.findByIdAndUpdate(
//           temp.userId,
//           { $push: { orders: order[0]._id } },
//           { session },
//         );

//         await Notification.create(
//           [
//             {
//               title: "سفارش جدید",
//               message: "یک سفارش جدید ثبت شد",
//               type: "order",
//               target: {
//                 kind: "Order",
//                 item: order[0]._id,
//               },
//             },
//           ],
//           { session },
//         );

//         await TempPayment.deleteOne({ authority }).session(session);
//       });
//     } finally {
//       await session.endSession();
//     }
//     console.log(Order, "order");

//     const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
//       orderId: createdOrderId,
//       authority,
//       refId: result?.data?.ref_id,
//     });
//     console.log(successUrl, "successUrl");

//     return NextResponse.redirect(successUrl);
//   } catch (error) {
//     console.error(error);
//     return NextResponse.redirect(failedUrl);
//   }
// }

import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import User from "@/model/User";
import mongoose from "mongoose";
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
      console.log("!authority || status !==")
      if (authority) await TempPayment.deleteOne({ authority });
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

      const successUrl = withPaymentQuery(baseUrl, successPath, {
        orderId: alreadyPaidOrder._id?.toString(),
        authority,
        refId: alreadyPaidOrder.paymentRefId,
      });
      console.log("successUrl",successUrl)

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
      console.log("verifyRes.json",result)

    const code = result?.data?.code;

    if (!verifyRes.ok || (code !== 100 && code !== 101)) {
      console.log("code !== 100 && code !== 101")

      return NextResponse.redirect(pendingUrl);
    }

    const mongoSession = await mongoose.startSession();
    let createdOrderId = "";
    let requiresRefund = false;

    try {
      await mongoSession.withTransaction(async () => {
        const duplicateOrder = await Order.findOne({
          paymentAuthority: authority,
          paymentStatus: { $in: ["paid", "pending_refund"] },
        }).session(mongoSession);

        if (duplicateOrder) {
          createdOrderId = duplicateOrder._id.toString();
          requiresRefund = duplicateOrder.paymentStatus === "pending_refund";
          await TempPayment.deleteOne({ authority }).session(mongoSession);
          return;
        }

        try {
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
                { session: mongoSession },
              );

              if (!updated) throw new Error("OUT_OF_STOCK");
              continue;
            }

            const updated = await Product.findOneAndUpdate(
              { _id: item.product, stock: { $gte: item.quantity } },
              { $inc: { stock: -item.quantity } },
              { session: mongoSession },
            );

            if (!updated) throw new Error("OUT_OF_STOCK");
          }
        } catch (stockError) {
          if (
            stockError instanceof Error &&
            stockError.message === "OUT_OF_STOCK"
          ) {
            requiresRefund = true;

            const refundOrder = await Order.create(
              [
                {
                  user: temp.userId,
                  address: temp.address,
                  items: temp.items,
                  totalPrice: temp.totalPrice,
                  shippingCost: temp.shippingCost,
                  finalPrice: temp.finalPrice,
                  status: "pending",
                  paymentStatus: "pending_refund",
                  paymentGateway: "zarinpal",
                  paymentAuthority: authority,
                  paymentRefId: result?.data?.ref_id ?? null,
                  paymentCardPan: result?.data?.card_pan ?? null,
                  paymentFeeType: result?.data?.fee_type ?? null,
                  paymentFee: result?.data?.fee ?? null,
                  paymentVerifiedAt: new Date(),
                  description: "PAYMENT_CAPTURED_OUT_OF_STOCK",
                },
              ],
              { session: mongoSession },
            );

            createdOrderId = refundOrder[0]._id.toString();

            await TempPayment.findOneAndUpdate(
              { authority },
              {
                $set: {
                  status: "refund_required",
                },
              },
              { session: mongoSession },
            );

            console.warn(
              JSON.stringify({
                event: "payment.verify.refund_required",
                authority,
                orderId: createdOrderId,
                userId: temp.userId,
              }),
            );

            return;
          }

          throw stockError;
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
          { session: mongoSession },
        );

        createdOrderId = order[0]._id.toString();

        await User.findByIdAndUpdate(
          temp.userId,
          { $push: { orders: order[0]._id } },
          { session: mongoSession },
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
          { session: mongoSession },
        );

        await TempPayment.deleteOne({ authority }).session(mongoSession);
      });
    } finally {
      await mongoSession.endSession();
    }

    const finalPath = requiresRefund ? "/payment-pending" : "/payment-success";
          console.log("finalPath",finalPath)

    const successUrl = withPaymentQuery(baseUrl, finalPath, {
      orderId: createdOrderId,
      authority,
      refId: result?.data?.ref_id,
    });

    console.info(
      JSON.stringify({
        event: "payment.verify.completed",
        authority,
        orderId: createdOrderId,
        requiresRefund,
      }),
    );

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(pendingUrl);
  }
}