import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import { NextResponse } from "next/server";
import Comment from "@/model/Comment";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { validateCatalogReferences } from "@/lib/catalogReferences";
import { notifyLowInventory } from "@/lib/notifications/events";
import {
  buildProductWriteInput,
  ProductInputValidationError,
} from "@/lib/productInput";
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
    const { productData: validatedProductData } = buildProductWriteInput(body, {
      mode: "create",
    });

    const productData = {
      ...validatedProductData,
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
      sku: generateSKU(),
    };

    const product = await Product.create(productData);
    const createdProduct = Array.isArray(product) ? product[0] : product;
    if (createdProduct?.status === "published") {
      await notifyLowInventory([createdProduct._id]).catch((error) =>
        console.error("[notifications] product inventory event failed:", error),
      );
    }
    return NextResponse.json({ message: "محصول جدید ساخته شد.", product });
  } catch (err: any) {
    console.log(err);

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
      { error: "خطا در ذخیره محصول" },
      { status: 500 },
    );
  }
}
