// import dbConnect from "@/lib/mongodb";
// import Address from "@/model/Address";
// // import Order from "@/model/Order";
// import Product from "@/model/Product";
// import TempPayment from "@/model/TempPayment";
// import { authOptions } from "@/app/api/auth/[...nextauth]/options";
// import { getServerSession } from "next-auth";
// import mongoose from "mongoose";
// import { NextRequest, NextResponse } from "next/server";
// import { getSiteUrl } from "@/lib/baseUrl";

// interface CheckoutItem {
//   productId: string;
//   quantity: number;
//   variantId?: string;
// }

// type ZarinpalResponse = {
//   data?: {
//     code?: number;
//     authority?: string;
//     message?: string;
//   };
//   errors?: {
//     code?: number;
//     message?: string;
//   };
// };
// const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;
// export async function POST(req: NextRequest) {
//   await dbConnect();

//   const session = await getServerSession(authOptions);
//   if (!session) {
//     return NextResponse.json(
//       { success: false, error: "Unauthorized" },
//       { status: 401 },
//     );
//   }

//   try {
//     const payload: {
//       addressId?: string;
//       items?: CheckoutItem[];
//       shippingCost?: number;
//     } = await req.json();
//     const idempotencyKey = req.headers.get("Idempotency-Key")?.trim() || null;
//     if (
//       !payload.addressId ||
//       !Array.isArray(payload.items) ||
//       payload.items.length === 0
//     ) {
//       return NextResponse.json(
//         { success: false, error: "درخواست سفارش نامعتبر است." },
//         { status: 400 },
//       );
//     }

//     if (!mongoose.isValidObjectId(payload.addressId)) {
//       return NextResponse.json(
//         { success: false, error: "شناسه آدرس معتبر نیست." },
//         { status: 400 },
//       );
//     }

//     const address = await Address.findOne({
//       _id: payload.addressId,
//       userId: session.user.id,
//     }).lean();

//     if (!address) {
//       return NextResponse.json(
//         { success: false, error: "آدرس انتخابی معتبر نیست." },
//         { status: 400 },
//       );
//     }

//     const normalizedItems = payload.items
//       .map((item) => ({
//         productId: item.productId,
//         quantity: Number(item.quantity),
//         variantId: item.variantId,
//       }))
//       .filter(
//         (item) =>
//           mongoose.isValidObjectId(item.productId) &&
//           (!item.variantId || mongoose.isValidObjectId(item.variantId)) &&
//           Number.isInteger(item.quantity) &&
//           item.quantity > 0,
//       );

//     if (normalizedItems.length !== payload.items.length) {
//       return NextResponse.json(
//         { success: false, error: "اطلاعات اقلام سفارش نامعتبر است." },
//         { status: 400 },
//       );
//     }

//     const productIds = normalizedItems.map((item) => item.productId);
//     const products = await Product.find({ _id: { $in: productIds } })
//       .select("price discountPrice stock productType variants")
//       .lean();

//     if (products.length !== productIds.length) {
//       return NextResponse.json(
//         { success: false, error: "برخی از محصولات نامعتبر هستند." },
//         { status: 400 },
//       );
//     }

//     const productMap = new Map(
//       products.map((product) => [String(product._id), product]),
//     );

//     const checkoutItems = normalizedItems.map((item) => {
//       const product = productMap.get(item.productId);
//       if (!product) throw new Error("PRODUCT_NOT_FOUND");

//       const hasVariants =
//         product.productType === "multi" && Array.isArray(product.variants);

//       if (hasVariants) {
//         const selectedVariant = product.variants?.find(
//           (variant: any) => String(variant._id) === String(item.variantId),
//         );

//         if (!selectedVariant) throw new Error("INVALID_VARIANT");
//         if (Number(selectedVariant.stock || 0) < item.quantity) {
//           throw new Error("INSUFFICIENT_STOCK");
//         }

//         const unitPrice =
//           selectedVariant.discountPrice ?? selectedVariant.price;

//         return {
//           product: item.productId,
//           variantId: selectedVariant._id,
//           variantTitle: selectedVariant.title,
//           price: Number(selectedVariant.price || 0),
//           discountPrice:
//             selectedVariant.discountPrice === null ||
//             selectedVariant.discountPrice === undefined
//               ? null
//               : Number(selectedVariant.discountPrice),
//           quantity: item.quantity,
//           total: Number(unitPrice || 0) * item.quantity,
//         };
//       }

//       if ((product.stock ?? 0) < item.quantity) {
//         throw new Error("INSUFFICIENT_STOCK");
//       }

//       const unitPrice = product.discountPrice ?? product.price;

//       return {
//         product: item.productId,
//         price: Number(product.price || 0),
//         discountPrice:
//           product.discountPrice === null || product.discountPrice === undefined
//             ? null
//             : Number(product.discountPrice),
//         quantity: item.quantity,
//         total: Number(unitPrice || 0) * item.quantity,
//       };
//     });

//     const shippingCost = Number(payload.shippingCost ?? 0);
//     if (!Number.isFinite(shippingCost) || shippingCost < 0) {
//       return NextResponse.json(
//         { success: false, error: "هزینه ارسال نامعتبر است." },
//         { status: 400 },
//       );
//     }

//     const totalPrice = checkoutItems.reduce((acc, item) => acc + item.total, 0);
//     const finalPrice = totalPrice + shippingCost;

//     const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
//     if (!merchant_id) {
//       return NextResponse.json(
//         { success: false, error: "Merchant ID تنظیم نشده است" },
//         { status: 500 },
//       );
//     }

//     if (idempotencyKey) {
//       const existingPayment = await TempPayment.findOne({
//         userId: session.user.id,
//         idempotencyKey,
//       }).lean();

//       if (
//         existingPayment &&
//         existingPayment.authority &&
//         existingPayment.status !== "failed"
//       ) {
//         return NextResponse.json({
//           success: true,
//           authority: existingPayment.authority,
//           url: `https://payment.zarinpal.com/pg/StartPay/${existingPayment.authority}`,
//           reused: true,
//         });
//       }
//     }

//     const callback_url = `${getSiteUrl()}/api/payment-zarinpal/verify`;
//     const amount = finalPrice * 10;

//     if (!Number.isFinite(amount) || amount < 1000) {
//       return NextResponse.json(
//         { success: false, error: "مبلغ پرداخت نامعتبر است" },
//         { status: 400 },
//       );
//     }
//     const zarinResponse = await fetch(
//       "https://payment.zarinpal.com/pg/v4/payment/request.json",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           merchant_id,
//           amount,
//           description: "پرداخت سفارش",
//           callback_url,
//         }),
//         cache: "no-store",
//       },
//     );

//     const result = (await zarinResponse.json()) as ZarinpalResponse;
//     if (!zarinResponse.ok) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: result?.errors?.message || "خطا در ارتباط با زرین‌پال",
//         },
//         { status: 502 },
//       );
//     }

//     if (result.data?.code !== 100 || !result.data.authority) {
//       return NextResponse.json(
//         {
//           success: false,
//           error:
//             result?.errors?.message ||
//             result?.data?.message ||
//             "خطا در ایجاد پرداخت",
//         },
//         { status: 500 },
//       );
//     }

//     const authority = result.data.authority;

//     await TempPayment.findOneAndUpdate(
//       { authority },
//       {
//         authority,
//         idempotencyKey,
//         status: "initiated",
//         failedAt: null,
//         expiresAt: new Date(Date.now() + PENDING_PAYMENT_TTL_MS),
//         userId: session.user.id,
//         address: payload.addressId,
//         items: checkoutItems,
//         totalPrice,
//         shippingCost,
//         finalPrice,
//         gatewayAmount: amount,
//       },
//       { upsert: true, setDefaultsOnInsert: true },
//     );

//     console.info(
//       JSON.stringify({
//         event: "payment.request.created",
//         authority,
//         userId: session.user.id,
//       }),
//     );

//     return NextResponse.json({
//       success: true,
//       authority,
//       url: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
//     });
//   } catch (error) {
//     if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
//       return NextResponse.json(
//         { success: false, error: "موجودی برخی محصولات کافی نیست." },
//         { status: 409 },
//       );
//     }

//     if (error instanceof Error && error.message === "INVALID_VARIANT") {
//       return NextResponse.json(
//         { success: false, error: "مدل انتخابی برای محصول معتبر نیست." },
//         { status: 400 },
//       );
//     }

//     const message = error instanceof Error ? error.message : "خطا در سرور";
//     return NextResponse.json(
//       { success: false, error: message },
//       { status: 500 },
//     );
//   }
// }

// بعد از chat
import dbConnect from "@/lib/mongodb";
import Address from "@/model/Address";
// import Order from "@/model/Order";
import Product from "@/model/Product";
import TempPayment from "@/model/TempPayment";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/baseUrl";
import { validateCoupon } from "@/lib/loyalty/coupon.service";

interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
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
  };
};
const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;
export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const payload: {
      addressId?: string;
      items?: CheckoutItem[];
      shippingCost?: number;
      couponCode?: string;
    } = await req.json();
    const idempotencyKey = req.headers.get("Idempotency-Key")?.trim() || null;
    if (
      !payload.addressId ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "درخواست سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(payload.addressId)) {
      return NextResponse.json(
        { success: false, error: "شناسه آدرس معتبر نیست." },
        { status: 400 },
      );
    }

    const address = await Address.findOne({
      _id: payload.addressId,
      userId: session.user.id,
    }).lean();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "آدرس انتخابی معتبر نیست." },
        { status: 400 },
      );
    }

    const normalizedItems = payload.items
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        variantId: item.variantId,
      }))
      .filter(
        (item) =>
          mongoose.isValidObjectId(item.productId) &&
          (!item.variantId || mongoose.isValidObjectId(item.variantId)) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );

    if (normalizedItems.length !== payload.items.length) {
      return NextResponse.json(
        { success: false, error: "اطلاعات اقلام سفارش نامعتبر است." },
        { status: 400 },
      );
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("price discountPrice stock productType variants category")
      .lean();

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: "برخی از محصولات نامعتبر هستند." },
        { status: 400 },
      );
    }

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const checkoutItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const hasVariants =
        product.productType === "multi" && Array.isArray(product.variants);

      if (hasVariants) {
        const selectedVariant = product.variants?.find(
          (variant: any) => String(variant._id) === String(item.variantId),
        );

        if (!selectedVariant) throw new Error("INVALID_VARIANT");
        if (Number(selectedVariant.stock || 0) < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const unitPrice =
          selectedVariant.discountPrice ?? selectedVariant.price;

        return {
          product: item.productId,
          variantId: selectedVariant._id,
          variantTitle: selectedVariant.title,
          price: Number(selectedVariant.price || 0),
          discountPrice:
            selectedVariant.discountPrice === null ||
            selectedVariant.discountPrice === undefined
              ? null
              : Number(selectedVariant.discountPrice),
          quantity: item.quantity,
          total: Number(unitPrice || 0) * item.quantity,
        };
      }

      if ((product.stock ?? 0) < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = product.discountPrice ?? product.price;

      return {
        product: item.productId,
        price: Number(product.price || 0),
        discountPrice:
          product.discountPrice === null || product.discountPrice === undefined
            ? null
            : Number(product.discountPrice),
        quantity: item.quantity,
        total: Number(unitPrice || 0) * item.quantity,
      };
    });

    const shippingCost = Number(payload.shippingCost ?? 0);
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      return NextResponse.json(
        { success: false, error: "هزینه ارسال نامعتبر است." },
        { status: 400 },
      );
    }

    const totalPrice = checkoutItems.reduce((acc, item) => acc + item.total, 0);

    // ── کوپن تخفیف (باشگاه مشتریان) ──
    let couponCode: string | null = null;
    let couponDiscount = 0;
    const rawCoupon = payload.couponCode?.trim();
    if (rawCoupon) {
      const validation = await validateCoupon({
        code: rawCoupon,
        userId: session.user.id,
        orderAmount: totalPrice,
        items: normalizedItems.map((item) => ({
          productId: item.productId,
          categoryIds: productMap.get(item.productId)?.category
            ? [String(productMap.get(item.productId)!.category)]
            : [],
        })),
      });
      if (!validation.ok) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 },
        );
      }
      couponCode = validation.coupon!.code;
      couponDiscount = validation.discountAmount!;
    }

    const finalPrice = totalPrice - couponDiscount + shippingCost;

    const merchant_id = process.env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant_id) {
      return NextResponse.json(
        { success: false, error: "Merchant ID تنظیم نشده است" },
        { status: 500 },
      );
    }

    if (idempotencyKey) {
      const existingPayment = await TempPayment.findOne({
        userId: session.user.id,
        idempotencyKey,
      }).lean();

      if (
        existingPayment &&
        existingPayment.authority &&
        existingPayment.status !== "failed"
      ) {
        return NextResponse.json({
          success: true,
          authority: existingPayment.authority,
          url: `https://payment.zarinpal.com/pg/StartPay/${existingPayment.authority}`,
          reused: true,
        });
      }
    }

    const callback_url = `${getSiteUrl()}/api/payment-zarinpal/verify`;
    const amount = finalPrice * 10;

    if (!Number.isFinite(amount) || amount < 1000) {
      return NextResponse.json(
        { success: false, error: "مبلغ پرداخت نامعتبر است" },
        { status: 400 },
      );
    }
    const zarinResponse = await fetch(
      "https://payment.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id,
          amount,
          description: "پرداخت سفارش",
          callback_url,
        }),
        cache: "no-store",
      },
    );

    const result = (await zarinResponse.json()) as ZarinpalResponse;
    if (!zarinResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result?.errors?.message || "خطا در ارتباط با زرین‌پال",
        },
        { status: 502 },
      );
    }

    if (result.data?.code !== 100 || !result.data.authority) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.errors?.message ||
            result?.data?.message ||
            "خطا در ایجاد پرداخت",
        },
        { status: 500 },
      );
    }

    const authority = result.data.authority;

    await TempPayment.findOneAndUpdate(
      { authority },
      {
        authority,
        idempotencyKey,
        status: "initiated",
        failedAt: null,
        expiresAt: new Date(Date.now() + PENDING_PAYMENT_TTL_MS),
        userId: session.user.id,
        address: payload.addressId,
        items: checkoutItems,
        totalPrice,
        shippingCost,
        finalPrice,
        couponCode,
        couponDiscount,
        gatewayAmount: amount,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    console.info(
      JSON.stringify({
        event: "payment.request.created",
        authority,
        userId: session.user.id,
      }),
    );

    return NextResponse.json({
      success: true,
      authority,
      url: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { success: false, error: "موجودی برخی محصولات کافی نیست." },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_VARIANT") {
      return NextResponse.json(
        { success: false, error: "مدل انتخابی برای محصول معتبر نیست." },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "خطا در سرور";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
