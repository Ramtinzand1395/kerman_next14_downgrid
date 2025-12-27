// app/api/products/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb"; // تابع اتصال به MongoDB
import Product from "@/model/Product";

export async function GET(req: NextRequest, context: { params: { slug: string } }) {
  const { slug } = context.params;
  if (!slug) {
    return NextResponse.json({ error: "Slug موجود نیست" }, { status: 400 });
  }

  try {
    await dbConnect(); // اتصال به MongoDB

    // جستجو محصول بر اساس slug و populate کردن روابط
    const product = await Product.findOne({ slug })
      .populate("images") // اگر مدل جدا برای تصاویر داری
      .populate({
        path: "specifications.items", // فرض اینکه specifications یک آرایه هست
      })
      .populate("category")
      .populate("tags")
      .populate({
        path: "comments",
        match: { verified: true }, // فقط کامنت‌های تایید شده
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
