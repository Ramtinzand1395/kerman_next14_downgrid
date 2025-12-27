// app/api/products/[id]/related/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";

export async function GET(req: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  try {
    if (!id) {
      return NextResponse.json(
        { error: "Product ID معتبر نیست" },
        { status: 400 }
      );
    }

    await dbConnect();

    // گرفتن محصول اصلی همراه با تگ‌ها
    const product = await Product.findById(id).populate("tags");

    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    const tagIds = product.tags.map((tag: any) => tag._id);

    if (tagIds.length === 0) {
      return NextResponse.json({ relatedProducts: [] }, { status: 200 });
    }

    // گرفتن محصولات مشابه بر اساس تگ‌ها، بدون محصول فعلی
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      tags: { $in: tagIds },
    })
      .populate("images")
      .populate("category")
      .populate("tags")
      .limit(5);

    return NextResponse.json({ relatedProducts });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "خطای سرور", details: error.message },
      { status: 500 }
    );
  }
}
