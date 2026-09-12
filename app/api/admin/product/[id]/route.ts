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
import { deleteUnusedCloudinaryImages } from "@/lib/cloudinary";
import { productValidationSchema } from "@/validations/validation";
import { ValidationError as YupValidationError } from "yup";
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

    const body = await productValidationSchema.validate(await req.json(), {
      abortEarly: false,
    });
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
    const safeVariants = Array.isArray(body.variants)
      ? body.variants
          .filter((v: any) => v?.title)
          .map((v: any) => ({
            title: String(v.title),
            sku: v?.sku ? String(v.sku) : undefined,
            price: Number(v?.price || 0),
            discountPrice:
              v?.discountPrice === null || v?.discountPrice === undefined
                ? null
                : Number(v.discountPrice),
            stock: Number(v?.stock || 0),
          }))
      : [];
    const safeGalleryImages = Array.isArray(body.galleryImages)
      ? body.galleryImages
          .map((img: any) => {
            if (typeof img === "string") {
              return { url: img, alt: "" };
            }

            if (!img?.url) {
              return null;
            }

            return {
              url: String(img.url),
              alt: img.alt ? String(img.alt) : "",
            };
          })
          .filter(Boolean)
      : [];
    const safeFaqs = Array.isArray(body.faqs)
      ? body.faqs
          .filter((f: any) => f?.question && f?.answer)
          .map((f: any) => ({
            question: String(f.question),
            answer: String(f.answer),
          }))
      : [];

    const productType = body.productType === "multi" ? "multi" : "single";
    const hasNegativeStock =
      productType === "multi"
        ? safeVariants.some((variant: { stock: number }) => variant.stock < 0)
        : Number(body.stock || 0) < 0;

    if (hasNegativeStock) {
      return NextResponse.json(
        { error: "موجودی محصول و تنوع‌ها نمی‌تواند منفی باشد." },
        { status: 400 },
      );
    }

    const totalStock =
      productType === "multi"
        ? safeVariants.reduce(
            (sum: number, v: any) => sum + Number(v.stock || 0),
            0,
          )
        : Number(body.stock || 0);

    const productData = {
      ...body,
      status: body.status === "published" ? "published" : "draft",
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
      productType,
      variants: productType === "multi" ? safeVariants : [],
      stock: totalStock,
     images: safeGalleryImages,
      faqs: safeFaqs,
    };

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    // Validate the new database state before permanently deleting old assets.
    const validationCandidate = new Product({
      ...existingProduct.toObject(),
      ...productData,
      _id: id,
    });
    await validationCandidate.validate();

    const previousImageUrls = [
      existingProduct.mainImage,
      ...(existingProduct.images || []).map((image: any) =>
        typeof image === "string" ? image : image.url,
      ),
    ].filter(Boolean);
    const nextImageUrls = new Set([
      String(productData.mainImage || ""),
      ...safeGalleryImages.map((image: any) => image.url),
    ]);

    await deleteUnusedCloudinaryImages(
      previousImageUrls.filter((url: string) => !nextImageUrls.has(url)),
      { excludeProductId: id },
    );

    const Update = await Product.findByIdAndUpdate(id, productData, {
      returnDocument: "after",
      runValidators: true,
    });
    return NextResponse.json(Update);
  } catch (err: any) {
    console.error("❌ Product Update Error:", err);

    if (err instanceof YupValidationError) {
      return NextResponse.json(
        { error: Array.from(new Set(err.errors)).join("، ") },
        { status: 400 },
      );
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

    const product = await Product.findById(id)
      .select("_id mainImage images")
      .lean();
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

    const productImageUrls = [
      product.mainImage,
      ...(product.images || []).map((image: any) =>
        typeof image === "string" ? image : image.url,
      ),
    ];

    await deleteUnusedCloudinaryImages(productImageUrls, {
      excludeProductId: id,
    });

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
