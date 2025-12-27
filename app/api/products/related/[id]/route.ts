// // app/api/products/[id]/related/route.ts
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/mongodb";
// import Product from "@/model/Product";

// export async function GET(req: Request, context: { params: { id: string } }) {
//   const { id } = context.params;

//   try {
//     if (!id) {
//       return NextResponse.json(
//         { error: "Product ID معتبر نیست" },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // گرفتن محصول اصلی همراه با تگ‌ها
//     const product = await Product.findById(id).populate("tags");

//     if (!product) {
//       return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
//     }

//     const tagIds = product.tags.map((tag: any) => tag._id);

//     if (tagIds.length === 0) {
//       return NextResponse.json({ relatedProducts: [] }, { status: 200 });
//     }

//     // گرفتن محصولات مشابه بر اساس تگ‌ها، بدون محصول فعلی
//     const relatedProducts = await Product.find({
//       _id: { $ne: product._id },
//       tags: { $in: tagIds },
//     })
//       .populate("images")
//       .populate("category")
//       .populate("tags")
//       .limit(5);

//     return NextResponse.json({ relatedProducts });
//   } catch (error: any) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "خطای سرور", details: error.message },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Product from "@/model/Product";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // بررسی وجود id
  if (!id) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  // بررسی معتبر بودن ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid Product ID" }, { status: 400 });
  }

  try {
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // برگرداندن محصول
    return NextResponse.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
