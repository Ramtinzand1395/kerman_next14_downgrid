// app/api/loyalty/coupon/validate/route.ts
// POST: اعتبارسنجی کد تخفیف از صفحه تسویه‌حساب — قیمت‌ها سمت سرور از دیتابیس خوانده می‌شوند.
// ورودی: { code, items: [{ productId, quantity, variantId? }] }
// خروجی: { ok, discountAmount, totalPrice, message? }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/model/Product";
import { validateCoupon } from "@/lib/loyalty/coupon.service";

interface ValidateItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export async function POST(req: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "برای استفاده از کد تخفیف وارد شوید" },
      { status: 401 },
    );
  }

  const body: { code?: string; items?: ValidateItem[] } = await req
    .json()
    .catch(() => ({}));

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "کد تخفیف را وارد کنید" },
      { status: 400 },
    );
  }

  const items = (Array.isArray(body.items) ? body.items : []).filter(
    (item) =>
      mongoose.isValidObjectId(item.productId) &&
      Number.isInteger(Number(item.quantity)) &&
      Number(item.quantity) > 0,
  );

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "سبد خرید نامعتبر است" },
      { status: 400 },
    );
  }

  const products = await Product.find({
    _id: { $in: items.map((i) => i.productId) },
  })
    .select("price discountPrice productType variants category")
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  // جمع سبد با قیمت‌های واقعی دیتابیس (همان منطق request پرداخت)
  let totalPrice = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const hasVariants =
      product.productType === "multi" && Array.isArray(product.variants);
    if (hasVariants) {
      const variant = product.variants?.find(
        (v: any) => String(v._id) === String(item.variantId),
      );
      if (!variant) continue;
      totalPrice +=
        Number(variant.discountPrice ?? variant.price ?? 0) *
        Number(item.quantity);
    } else {
      totalPrice +=
        Number(product.discountPrice ?? product.price ?? 0) *
        Number(item.quantity);
    }
  }

  const validation = await validateCoupon({
    code,
    userId: session.user.id,
    orderAmount: totalPrice,
    items: items.map((item) => ({
      productId: item.productId,
      categoryIds: productMap.get(item.productId)?.category
        ? [String(productMap.get(item.productId)!.category)]
        : [],
    })),
  });

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error });
  }

  return NextResponse.json({
    ok: true,
    code: validation.coupon!.code,
    title: validation.coupon!.title ?? null,
    discountAmount: validation.discountAmount,
    totalPrice,
  });
}
