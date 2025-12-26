import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import "@/model/Category";
import "@/model/Tag";
import { NextResponse } from "next/server";
import Comment from "@/model/Comment";

export async function GET(req: Request) {
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
      0
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
  const generateSKU = () =>
    `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    const body = await req.json();
    const productData = {
      ...body,
      images: body.galleryImages,
      sku: generateSKU(),
    };

    const product = await Product.create(productData);
    return NextResponse.json({ message: "محصول جدید ساخته شد.", product });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ message: err }, { status: 500 });
  }
}
