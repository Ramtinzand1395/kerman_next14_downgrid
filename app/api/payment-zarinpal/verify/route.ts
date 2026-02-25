// // import dbConnect from "@/lib/mongodb";
// // import Order from "@/model/Order";
// // import Product from "@/model/Product";
// // import TempPayment from "@/model/TempPayment";
// // import { NextRequest, NextResponse } from "next/server";

// // export async function GET(req: NextRequest) {
// //   try {
// //     await dbConnect();

// //     const { searchParams } = new URL(req.url);
// //     const authority = searchParams.get("Authority");
// //     const status = searchParams.get("Status");

// //     if (!authority) {
// //       return NextResponse.redirect(
// //         `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //       );
// //     }

// //     // اگر پرداخت لغو شده بود
// //     if (status !== "OK") {
// //       return NextResponse.redirect(
// //         `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //       );
// //     }

// //     // گرفتن پرداخت موقت
// //     const temp = await TempPayment.findOne({ authority }).lean();
// //     if (!temp) {
// //       return NextResponse.redirect(
// //         `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //       );
// //     }

// //     const { finalPrice, items, orderId, userId } = temp;

// //     // ارسال درخواست تایید به زرین پال
// //     const verifyRes = await fetch(
// //       "https://api.zarinpal.com/pg/v4/payment/verify.json",
// //       {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({
// //           merchant_id: process.env.ZARINPAL_MERCHANT_ID,
// //           amount: finalPrice,
// //           authority,
// //         }),
// //       },
// //     );

// //     const result = await verifyRes.json();

// //     if (result.data && result.data.code === 100) {
// //       // کاهش موجودی محصولات
// //       const stockUpdateResults = await Promise.all(
// //         items.map(async (item: { product: string; quantity: number }) => {
// //           return Product.findOneAndUpdate(
// //             { _id: item.product, stock: { $gte: item.quantity } },
// //             { $inc: { stock: -item.quantity } },
// //           );
// //         }),
// //       );

// //       if (stockUpdateResults.some((updatedProduct) => !updatedProduct)) {
// //         return NextResponse.redirect(
// //           `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //         );
// //       }

// //       // نهایی سازی سفارش
// //       const order = await Order.findOneAndUpdate(
// //         { _id: orderId, user: userId, paymentStatus: { $ne: "paid" } },
// //         { paymentStatus: "paid" },
// //         { new: true },
// //       );

// //       if (!order) {
// //         return NextResponse.redirect(
// //           `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //         );
// //       }

// //       // حذف پرداخت موقت
// //       await TempPayment.deleteOne({ authority });

// //       // ریدایرکت به صفحه موفقیت
// //       return NextResponse.redirect(
// //         `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`,
// //       );
// //     }

// //     // در صورت عدم تایید پرداخت
// //     return NextResponse.redirect(
// //       `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //     );
// //   } catch (err) {
// //     console.error(err);
// //     return NextResponse.redirect(
// //       `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
// //     );
// //   }
// // }

// import dbConnect from "@/lib/mongodb";
// import Order from "@/model/Order";
// import Product from "@/model/Product";
// import TempPayment from "@/model/TempPayment";
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
//     message?: string;
//     ref_id?: number;
//     card_pan?: string;
//     fee_type?: string;
//     fee?: number;
//   };
//   errors?: {
//     code?: number;
//     message?: string;
//     validations?: Record<string, string[]>;
//   };
// };

// export async function GET(req: NextRequest) {
//   await dbConnect();

//   const baseUrl = getBaseUrl(req);
//   const failedUrl = `${baseUrl}/payment-failed`;
//   const successUrl = `${baseUrl}/payment-success`;

//   try {
//     const { searchParams } = new URL(req.url);
//     const authority = searchParams.get("Authority");
//     const status = searchParams.get("Status");

//     if (!authority) return NextResponse.redirect(failedUrl);

//     // اگر پرداخت لغو شده بود
//     if (status !== "OK") return NextResponse.redirect(failedUrl);

//     const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
//     if (!merchant_id) return NextResponse.redirect(failedUrl);

//     // گرفتن پرداخت موقت
//     const temp = await TempPayment.findOne({ authority }).lean();
//     if (!temp) {
//       // اگر temp نداریم، ممکنه قبلاً تایید و حذف شده باشه.
//       // اگر سفارش قبلاً paid شده، موفق نشان بده تا تجربه کاربر خراب نشه.
//       const alreadyPaidOrder = await Order.findOne({
//         paymentAuthority: authority,
//         paymentStatus: "paid",
//       }).lean();
//       return NextResponse.redirect(alreadyPaidOrder ? successUrl : failedUrl);
//     }

//     const { finalPrice, items, orderId, userId } = temp;

//     // Verify با دامنه درست (Production)
//     const verifyRes = await fetch(
//       "https://payment.zarinpal.com/pg/v4/payment/verify.json",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           merchant_id,
//           amount: finalPrice,
//           authority,
//         }),
//         cache: "no-store",
//       },
//     );

//     const result = (await verifyRes.json()) as ZarinpalVerifyResponse;

//     if (!verifyRes.ok) return NextResponse.redirect(failedUrl);

//     const code = result?.data?.code;

//     // 100: موفق، 101: قبلاً تایید شده
//     if (code !== 100 && code !== 101) return NextResponse.redirect(failedUrl);

//     // عملیات اتمیک با Transaction
//     const session = await mongoose.startSession();
//     try {
//       await session.withTransaction(async () => {
//         // اگر سفارش قبلاً paid شده، دیگه موجودی کم نکن
//         const existingOrder = await Order.findOne({
//           _id: orderId,
//           user: userId,
//         }).session(session);
//         if (!existingOrder) {
//           throw new Error("ORDER_NOT_FOUND");
//         }
//         if (existingOrder.paymentStatus === "paid") {
//           // فقط temp را حذف کن
//           await TempPayment.deleteOne({ authority }).session(session);
//           return;
//         }

//         // کاهش موجودی محصولات (با شرط کافی بودن موجودی)
//         for (const item of items as Array<{
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
//               { returnDocument: "after", session },
//             );

//             if (!updated) throw new Error("OUT_OF_STOCK");
//             continue;
//           }

//           const updated = await Product.findOneAndUpdate(
//             { _id: item.product, stock: { $gte: item.quantity } },
//             { $inc: { stock: -item.quantity } },
//             { returnDocument: "after", session },
//           );
//           if (!updated) throw new Error("OUT_OF_STOCK");
//         }

//         // نهایی‌سازی سفارش + ذخیره اطلاعات پرداخت (اختیاری ولی توصیه‌شده)
//         const updatedOrder = await Order.findOneAndUpdate(
//           { _id: orderId, user: userId, paymentStatus: { $ne: "paid" } },
//           {
//             paymentStatus: "paid",
//             paymentAuthority: authority,
//             paymentRefId: result?.data?.ref_id ?? null,
//           },
//           { returnDocument: "after", session },
//         );

//         if (!updatedOrder) throw new Error("ORDER_UPDATE_FAILED");

//         // حذف پرداخت موقت
//         await TempPayment.deleteOne({ authority }).session(session);
//       });

//       return NextResponse.redirect(successUrl);
//     } finally {
//       await session.endSession();
//     }
//   } catch (err) {
//     console.error(err);
//     return NextResponse.redirect(failedUrl);
//   }
// }

import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
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
    message?: string;
    ref_id?: number;
    card_pan?: string;
    fee_type?: string;
    fee?: number;
  };
  errors?: {
    code?: number;
    message?: string;
    validations?: Record<string, string[]>;
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

  const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();

  try {
    if (!authority || status !== "OK" || !merchant_id) {
      if (authority) {
        await Order.findOneAndUpdate(
          { paymentAuthority: authority, paymentStatus: { $ne: "paid" } },
          {
            paymentStatus: "failed",
            paymentAuthority: authority,
          },
        );
      }

      return NextResponse.redirect(failedUrl);
    }

    // گرفتن پرداخت موقت
    const temp = await TempPayment.findOne({ authority }).lean();
    if (!temp) {
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

      return NextResponse.redirect(failedUrl);
    }

    const { finalPrice, items, orderId, userId } = temp;

    const verifyRes = await fetch(
      "https://payment.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount: finalPrice,
          authority,
        }),
        cache: "no-store",
      },
    );

    const result = (await verifyRes.json()) as ZarinpalVerifyResponse;

    if (!verifyRes.ok) {
      await Order.findOneAndUpdate(
        { _id: orderId, user: userId, paymentStatus: { $ne: "paid" } },
        {
          paymentStatus: "failed",
          paymentAuthority: authority,
        },
      );

      return NextResponse.redirect(failedUrl);
    }

    const code = result?.data?.code;

    // 100: موفق، 101: قبلاً تایید شده
    if (code !== 100 && code !== 101) {
      await Order.findOneAndUpdate(
        { _id: orderId, user: userId, paymentStatus: { $ne: "paid" } },
        {
          paymentStatus: "failed",
          paymentAuthority: authority,
        },
      );

      return NextResponse.redirect(failedUrl);
    }

    // عملیات اتمیک با Transaction
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        const existingOrder = await Order.findOne({
          _id: orderId,
          user: userId,
        }).session(dbSession);

        if (!existingOrder) {
          throw new Error("ORDER_NOT_FOUND");
        }

        if (existingOrder.paymentStatus === "paid") {
          await TempPayment.deleteOne({ authority }).session(dbSession);
          return;
        }

        for (const item of items as Array<{
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
              { returnDocument: "after", session: dbSession },
            );

            if (!updated) throw new Error("OUT_OF_STOCK");
            continue;
          }

          const updated = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { returnDocument: "after", session: dbSession },
          );

          if (!updated) throw new Error("OUT_OF_STOCK");
        }

        const updatedOrder = await Order.findOneAndUpdate(
          { _id: orderId, user: userId, paymentStatus: { $ne: "paid" } },
          {
            paymentStatus: "paid",
            paymentGateway: "zarinpal",
            paymentAuthority: authority,
            paymentRefId: result?.data?.ref_id ?? null,
            paymentCardPan: result?.data?.card_pan ?? null,
            paymentFeeType: result?.data?.fee_type ?? null,
            paymentFee: result?.data?.fee ?? null,
            paymentVerifiedAt: new Date(),
          },
          { returnDocument: "after", session: dbSession },
        );

        if (!updatedOrder) throw new Error("ORDER_UPDATE_FAILED");

        await TempPayment.deleteOne({ authority }).session(dbSession);
      });
    } finally {
      await dbSession.endSession();
    }

    const successUrl = withPaymentQuery(baseUrl, "/payment-success", {
      orderId: orderId.toString(),
      authority,
      refId: result?.data?.ref_id,
    });

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(failedUrl);
  }
}