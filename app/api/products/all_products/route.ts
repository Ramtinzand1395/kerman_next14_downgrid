import { NextResponse } from "next/server";

import Category from "@/model/Category";
import Product from "@/model/Product";
import dbConnect from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const sortParam = searchParams.get("sort");
    const query = (searchParams.get("q") || "").trim();
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 12);
    const skip = (page - 1) * limit;

     const filter: Record<string, any> = { status: "published" };

    if (categorySlug) {
      const mainCategory = await Category.findOne({
        slug: categorySlug,
      }).select("_id");

      if (!mainCategory) {
        return NextResponse.json({ products: [], total: 0, page, limit });
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

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    const total = await Product.countDocuments(filter);

    // اگر sort ارسال نشده بود: بر اساس میانگین امتیاز کامنت‌ها مرتب کن
    if (!sortParam) {
      const products = await Product.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "comments",
            localField: "comments",
            foreignField: "_id",
            as: "comments",
          },
        },
        {
          $addFields: {
            averageRating: {
              $ifNull: [{ $avg: "$comments.rating" }, 0],
            },
          },
        },
        { $sort: { averageRating: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      return NextResponse.json({ products, total, page, limit });
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };

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
      case "newest":
        sort = { createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const products = await Product.find(filter)
      .populate({
        path: "comments",
        match: { verified: true },
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
      { status: 500 },
    );
  }
}
