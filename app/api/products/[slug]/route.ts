// app/api/products/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb"; // تابع اتصال به MongoDB
import Product from "@/model/Product";
import "@/model/Category";
import "@/model/Tag";
import "@/model/Comment";

export async function GET(
  req: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;
  if (!slug) {
    return NextResponse.json({ error: "Slug موجود نیست" }, { status: 400 });
  }

  try {
    await dbConnect(); // اتصال به MongoDB
   const product = await Product.findOne({ slug, status: "published" })
      .populate("images") // اگر مدل جدا برای تصاویر داری
      .populate({
        path: "specifications.items", // فرض اینکه specifications یک آرایه هست
      })
      .populate("category")
      .populate("tags")
      .populate({
        path: "comments",
        match: { verified: true },
        model: "Comment",
        populate: { path: "user", model: "User" },
      });
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطای داخلی" }, { status: 500 });
  }
}
