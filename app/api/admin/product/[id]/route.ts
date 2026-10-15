import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import mongoose from "mongoose";
import Order from "@/model/Order";
import TempPayment from "@/model/TempPayment";
import Coupon from "@/model/Loyalty Club/Coupon";
import CashbackRule from "@/model/Loyalty Club/CashbackRule";
import Comment from "@/model/Comment";
import Favorite from "@/model/Favorite";
import Notification from "@/model/Notification";
import User from "@/model/User";
import { validateCatalogReferences } from "@/lib/catalogReferences";
import { notifyLowInventory } from "@/lib/notifications/events";
import {
  buildProductWriteInput,
  ProductInputValidationError,
} from "@/lib/productInput";
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const { id } = await params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

    if (session.user.role !== "superadmin")
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

    const body = await req.json();
    const catalogReferences = await validateCatalogReferences(
      body?.category,
      body?.tags,
    );
    if (!catalogReferences.ok) {
      return NextResponse.json(
        { error: catalogReferences.error },
        { status: 400 },
      );
    }
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    const existingVariantIds = (product.variants ?? []).map((variant: any) =>
      String(variant._id),
    );
    const {
      productData: validatedProductData,
      removedVariantIds,
    } = buildProductWriteInput(body, {
      mode: "update",
      productId: id,
      existingVariantIds,
    });

    const productData = {
      ...validatedProductData,
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
    };
    const previousStock = product.stock;
    const previousStatus = product.status;

    // Kept outside persistence for now. A later transaction-backed catalog
    // service will consume this list when it emits the Product revision.
    product.$locals.removedVariantIds = removedVariantIds;
    product.set(productData);
    const Update = await product.save();
    if (
      Update?.status === "published" &&
      Number(Update.stock) <= 5 &&
      (Number(previousStock) !== Number(Update.stock) ||
        previousStatus !== "published")
    ) {
      await notifyLowInventory([Update._id]).catch((error) =>
        console.error("[notifications] product inventory event failed:", error),
      );
    }
    return NextResponse.json(Update);
  } catch (err: any) {
    console.error("❌ Product Update Error:", err);

    if (err instanceof ProductInputValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // خطاهای اعتبارسنجی Mongoose را به پیام فارسی تبدیل می‌کنیم
    if (err?.name === "ValidationError" && err?.errors) {
      const fieldNames: Record<string, string> = {
        title: "عنوان محصول",
        slug: "نامک (slug)",
        mainImage: "تصویر اصلی",
        category: "دسته‌بندی",
        price: "قیمت",
        stock: "موجودی",
        brand: "برند",
        description: "توضیحات",
      };

      const messages = Object.values(err.errors).map((e: any) => {
        const label = fieldNames[e.path] || e.path;
        if (e.kind === "required") {
          return `${label} الزامی است`;
        }
        return e.message;
      });

      return NextResponse.json(
        { error: messages.join("، ") },
        { status: 400 },
      );
    }

    // خطای تکراری بودن (مثلاً slug یا sku تکراری)
    if (err?.code === 11000) {
      const field = Object.keys(err?.keyPattern || {})[0];
      const label =
        field === "slug" ? "نامک (slug)" : field === "sku" ? "SKU" : field;
      return NextResponse.json(
        { error: `${label} وارد شده تکراری است.` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "خطا در بروزرسانی محصول" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }

    const product = await Product.findById(id).select("_id").lean();
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    // Never orphan immutable order/payment history or broaden a restricted
    // loyalty rule by silently removing its only product constraint.
    const [historicalOrder, paymentAttempt, coupon, cashbackRule] =
      await Promise.all([
        Order.exists({ "items.product": id }),
        TempPayment.exists({ "items.product": id }),
        Coupon.exists({ products: id }),
        CashbackRule.exists({ products: id }),
      ]);

    if (historicalOrder || paymentAttempt || coupon || cashbackRule) {
      return NextResponse.json(
        {
          error:
            "این محصول در سفارش، پرداخت یا قانون باشگاه استفاده شده است و حذف آن به تاریخچه آسیب می‌زند. آن را به حالت پیش‌نویس ببرید.",
        },
        { status: 409 },
      );
    }

    const [comments, favorites] = await Promise.all([
      Comment.find({ product: id }).select("_id").lean(),
      Favorite.find({ productId: id }).select("_id").lean(),
    ]);
    const commentIds = comments.map((comment) => comment._id);
    const favoriteIds = favorites.map((favorite) => favorite._id);

    // Comments/favorites have no meaning without a product, so clean every
    // denormalized reference before removing the product itself.
    await Promise.all([
      Comment.deleteMany({ product: id }),
      Favorite.deleteMany({ productId: id }),
      Notification.deleteMany({
        $or: [
          { "target.kind": "Product", "target.item": id },
          { "target.kind": "Comment", "target.item": { $in: commentIds } },
        ],
      }),
      User.updateMany(
        {},
        {
          $pull: {
            comments: { $in: commentIds },
            favorites: { $in: favoriteIds },
          },
        },
      ),
    ]);

    await Product.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در حذف محصول" }, { status: 500 });
  }
}
