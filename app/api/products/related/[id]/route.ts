import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // بررسی وجود id
  if (!id) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 },
    );
  }

  // بررسی معتبر بودن ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid Product ID" }, { status: 400 });
  }

  try {
    await dbConnect();

    const product = await Product.findById(id).select("category");

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select("title slug mainImage price discountPrice");

    return NextResponse.json({ relatedProducts });
  } catch (err) {
    console.error("Error fetching product:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
