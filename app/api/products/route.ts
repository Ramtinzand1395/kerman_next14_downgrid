export * from "../_config";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import Category from "@/model/Category";
import "@/model/Tag";
import "@/model/Comment";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const hasDiscount = searchParams.get("discount");

    const filter: any = { status: "published" };

    /* ================== DISCOUNT FILTER ================== */
    if (hasDiscount === "true") {
      filter.$expr = {
        $and: [
          { $ne: ["$discountPrice", null] },
          { $lt: ["$discountPrice", "$price"] },
        ],
      };
    }

    /* ================== CATEGORY FILTER ================== */
    if (categorySlug) {
      const mainCategory = await Category.findOne({
        slug: categorySlug,
      }).select("_id");

      // اگر دسته وجود نداشت → هیچی برنگرد
      if (!mainCategory) {
        return NextResponse.json([]);
      }

      const subCategories = await Category.find({
        parent: mainCategory._id,
      }).select("_id");

      const categoryIds = [
        mainCategory._id,
        ...subCategories.map((c) => c._id),
      ];

      filter.category = { $in: categoryIds };
    }

    /* ================== QUERY ================== */
    const products = await Product.find(filter)
      .lean()
      .populate("category")
      .populate("images")
      .populate("tags")
      .populate({
        path: "comments",
        match: { verified: true },
      });

    return NextResponse.json(products);
  } catch (err) {
    console.error("❌ Products API Error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت محصولات" },
      { status: 500 },
    );
  }
}
