import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import { NextResponse } from "next/server";
import Comment from "@/model/Comment";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { validateCatalogReferences } from "@/lib/catalogReferences";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin" ) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  const total = await Product.countDocuments();
  const products = await Product.find()
    .populate({
      path: "category",
      populate: {
        path: "parent", // اینجا parent را هم populate می‌کنیم
        select: "name slug _id", // فقط فیلدهای مورد نیاز
      },
    })

    .populate("tags")
    .populate("specifications")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const stats = {
    total: total,
    value: products.reduce(
      (acc, p) => acc + Number(p.price || 0) * Number(p.stock || 0),
      0,
    ),
    lowStock: products.filter((p) => Number(p.stock) < 5).length,
    comments: await Comment.countDocuments(),
    verifiedComments: await Comment.countDocuments({ verified: false }),
  };

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats,
  });
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const generateSKU = () =>
    `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
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
      productType,
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
      variants: productType === "multi" ? safeVariants : [],
      stock: totalStock,
      images: safeGalleryImages,
      faqs: safeFaqs,
      sku: generateSKU(),
    };

    const product = await Product.create(productData);
    return NextResponse.json({ message: "محصول جدید ساخته شد.", product });
  } catch (err: any) {
    console.log(err);

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
      { error: "خطا در ذخیره محصول" },
      { status: 500 },
    );
  }
}
