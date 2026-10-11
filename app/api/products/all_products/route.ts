import { NextResponse } from "next/server";

import Category from "@/model/Category";
import Comment from "@/model/Comment";
import Product from "@/model/Product";
import Tag from "@/model/Tag";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

function positiveInteger(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value || "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getTagFacets(filter: Record<string, unknown>) {
  return Product.aggregate([
    { $match: filter },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    {
      $lookup: {
        from: Tag.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "tag",
      },
    },
    { $unwind: "$tag" },
    {
      $project: {
        _id: "$tag._id",
        name: "$tag.name",
        slug: "$tag.slug",
        count: 1,
      },
    },
    { $sort: { count: -1, name: 1 } },
  ]);
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const tagSlug = searchParams.get("tag");
    const sortParam = searchParams.get("sort");
    const query = (searchParams.get("q") || "").trim().slice(0, 80);
    const page = positiveInteger(searchParams.get("page"), 1);
    const limit = positiveInteger(
      searchParams.get("limit"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * limit;

    // Excluding `tag` here lets the UI offer other tags without losing the
    // current category and text-search context.
    const baseFilter: Record<string, any> = { status: "published" };

    if (categorySlug) {
      const mainCategory = await Category.findOne({
        slug: categorySlug,
      }).select("_id");

      if (!mainCategory) {
        return NextResponse.json({
          products: [],
          total: 0,
          page,
          limit,
          filters: { tags: [], selectedTag: null },
        });
      }

      const subCategories = await Category.find({
        parent: mainCategory._id,
      }).select("_id");

      const categoryIds = [
        mainCategory._id,
        ...subCategories.map((c) => c._id),
      ];

      baseFilter.category = { $in: categoryIds };
    }

    if (query) {
      const safeQuery = escapeRegex(query);
      baseFilter.$or = [
        { title: { $regex: safeQuery, $options: "i" } },
        { slug: { $regex: safeQuery, $options: "i" } },
        { brand: { $regex: safeQuery, $options: "i" } },
      ];
    }

    const [availableTags, selectedTag] = await Promise.all([
      getTagFacets(baseFilter),
      tagSlug
        ? Tag.findOne({ slug: tagSlug }).select("_id name slug").lean()
        : Promise.resolve(null),
    ]);

    if (tagSlug && !selectedTag) {
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        limit,
        filters: { tags: availableTags, selectedTag: null },
      });
    }

    const filter: Record<string, any> = { ...baseFilter };
    if (selectedTag) {
      filter.tags = selectedTag._id;
    }

    const total = await Product.countDocuments(filter);

    // اگر sort ارسال نشده بود: بر اساس میانگین امتیاز کامنت‌ها مرتب کن
    if (!sortParam) {
      const products = await Product.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: Comment.collection.name,
            let: { commentIds: "$comments" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$_id", "$$commentIds"] },
                  verified: true,
                },
              },
            ],
            as: "comments",
          },
        },
        {
          $lookup: {
            from: Tag.collection.name,
            localField: "tags",
            foreignField: "_id",
            as: "tags",
          },
        },
        {
          $lookup: {
            from: Category.collection.name,
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true,
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

      return NextResponse.json({
        products,
        total,
        page,
        limit,
        filters: { tags: availableTags, selectedTag },
      });
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
      .populate("category")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      filters: { tags: availableTags, selectedTag },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در دریافت محصولات" },
      { status: 500 },
    );
  }
}
