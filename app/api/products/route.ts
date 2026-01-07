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

    const filter: any = {};

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
      { status: 500 }
    );
  }
}

// // import { NextResponse } from "next/server";
// // import Category from "@/model/Category";
// // import Product from "@/model/Product";
// // import dbConnect from "@/lib/mongodb";
// // // import "@/model/Category";
// // import "@/model/Tag";
// // import "@/model/Comment";

// // export async function GET(req: Request) {
// //   try {
// //     await dbConnect();

// //     const { searchParams } = new URL(req.url);
// //     const categorySlug = searchParams.get("category");
// //     const hasDiscount = searchParams.get("discount");

// //     const filter: any = {};
// //     const all = await Category.find();
// //     console.log(all, "allcats");
// //     // فیلتر بر اساس تخفیف
// //     if (hasDiscount === "true") {
// //       filter.discountPrice = { $ne: null };
// //     }

// //     // فیلتر بر اساس دسته‌بندی با slug (نه id)
// //     if (categorySlug) {
// //       const mainCategory = await Category.findOne({
// //         slug: categorySlug,
// //       }).select("_id");
// //       console.log(mainCategory, "main");
// //       if (mainCategory) {
// //         // پیدا کردن زیر‌دسته‌ها
// //         const subCategories = await Category.find({
// //           parentId: mainCategory._id,
// //         }).select("_id");
// //         const categoryIds = [
// //           mainCategory._id,
// //           ...subCategories.map((c) => c._id),
// //         ];
// //         console.log(subCategories, "subCategories");
// //         filter.categoryId = { $in: categoryIds };
// //       }
// //     }
// //     console.log(filter);
// //     // دریافت محصولات
// //     const products = await Product.find(filter)
// //       .populate("category")
// //       .populate("images")
// //       .populate("tags")
// //       .populate({
// //         path: "comments",
// //         match: { verified: true }, // فقط کامنت‌های تایید شده
// //       });

// //     return NextResponse.json(products);
// //   } catch (err) {
// //     console.error("❌ خطا در دریافت محصولات:", err);
// //     return NextResponse.json(
// //       { error: "خطا در دریافت محصولات" },
// //       { status: 500 }
// //     );
// //   }
// // }

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/mongodb";
// import Product from "@/model/Product";
// import Category from "@/model/Category";
// import "@/model/Tag";
// import "@/model/Comment";

// export async function GET(req: Request) {
//   try {
//     await dbConnect();

//     const { searchParams } = new URL(req.url);
//     const categorySlug = searchParams.get("category");
//     const hasDiscount = searchParams.get("discount");

//     const filter: any = {};

//     // فیلتر تخفیف
//     if (hasDiscount === "true") {
//       filter.discountPrice = { $ne: null };
//     }

//     // فیلتر دسته‌بندی + زیر دسته‌ها
//     if (categorySlug) {
//       const mainCategory = await Category.findOne({
//         slug: categorySlug,
//       }).select("_id");

//       if (mainCategory) {
//         const subCategories = await Category.find({
//           parent: mainCategory._id,
//         }).select("_id");

//         const categoryIds = [
//           mainCategory._id,
//           ...subCategories.map((c) => c._id),
//         ];

//         filter.category = { $in: categoryIds }; // 👈 خیلی مهم
//       }
//     }
//     // دریافت محصولات
//     const products = await Product.find(filter)
//       .populate("category")
//       .populate("images")
//       .populate("tags")
//       .populate({
//         path: "comments",
//         match: { verified: true },
//       });

//     return NextResponse.json(products);
//   } catch (err) {
//     console.error("❌ خطا در دریافت محصولات:", err);
//     return NextResponse.json(
//       { error: "خطا در دریافت محصولات" },
//       { status: 500 }
//     );
//   }
// }
