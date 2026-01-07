// app/api/products/route.ts
import { NextResponse } from "next/server";
import Product from "@/model/Product";
import Category from "@/model/Category";
import dbConnect from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const sortParam = searchParams.get("sort");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 12);
    const skip = (page - 1) * limit;

    const filter: any = {};

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
    // sorting
    let sort: any = { createdAt: -1 };

    switch (sortParam) {
      case "highPrice":
        sort = { price: -1 };
        break;
      case "lowPrice":
        sort = { price: 1 };
        break;
      case "bestSeller":
        sort = { soldCount: -1 };
        break;
      case "highestDiscount":
        sort = { discountPrice: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate({
        path: "comments",
        match: { verified: true }, // فقط تایید شده‌ها
      })
      .populate("images")
      .populate("tags")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در دریافت محصولات" },
      { status: 500 }
    );
  }
}
