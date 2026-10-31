import { cache } from "react";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Category from "@/model/Category";
import Product from "@/model/Product";
import Tag from "@/model/Tag";
import "@/model/Comment";
import {
  buildCategoryEntries,
  descendantIds,
  type CategoryRow,
  type CatalogQuery,
} from "./category-seo";
import type { Product as ProductType, ProductTagFacet } from "@/types";

export const getCategoryCatalog = cache(async () => {
  await dbConnect();
  const [raw, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).lean().exec(),
    Product.aggregate([
      { $match: { status: "published", deletedAt: null } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);
  const rows: CategoryRow[] = raw.map((row) => ({
    ...JSON.parse(JSON.stringify(row)),
    _id: String(row._id),
    parent: row.parent ? String(row.parent) : null,
  }));
  return buildCategoryEntries(rows, counts);
});

export const PAGE_SIZE = 12;
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Derived from active variants, matching the product cards; the parent price/stock
// does not represent the selectable prices or inventory of a multi-product.
export function listingStages() {
  return [
    {
      $set: {
        _activeVariants: {
          $filter: {
            input: { $ifNull: ["$variants", []] },
            as: "variant",
            cond: { $ne: ["$$variant.isActive", false] },
          },
        },
      },
    },
    {
      $set: {
        _listingPrice: {
          $cond: [
            { $eq: ["$productType", "multi"] },
            {
              $min: {
                $map: {
                  input: "$_activeVariants",
                  as: "variant",
                  in: {
                    $ifNull: ["$$variant.discountPrice", "$$variant.price"],
                  },
                },
              },
            },
            { $ifNull: ["$discountPrice", "$price"] },
          ],
        },
        _listingStock: {
          $cond: [
            { $eq: ["$productType", "multi"] },
            { $sum: "$_activeVariants.stock" },
            { $ifNull: ["$stock", 0] },
          ],
        },
      },
    },
  ];
}

export async function getCategoryProducts(
  categoryId: string,
  rows: CategoryRow[],
  query: CatalogQuery,
) {
  await dbConnect();
  const filter: Record<string, unknown> = {
    status: "published",
    deletedAt: null,
    category: {
      $in: descendantIds(categoryId, rows).map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
    },
  };
  if (query.q)
    filter.$or = ["title", "brand"].map((key) => ({
      [key]: { $regex: escapeRegex(query.q), $options: "i" },
    }));
  const [tags, selectedTag] = await Promise.all([
    Product.aggregate([
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
    ]),
    query.tag
      ? Tag.findOne({ slug: query.tag }).select("_id").lean()
      : Promise.resolve(null),
  ]);
  if (query.tag && !selectedTag)
    return {
      products: [] as ProductType[],
      tags: JSON.parse(JSON.stringify(tags)) as ProductTagFacet[],
      total: 0,
    };
  if (selectedTag) filter.tags = selectedTag._id;
  const sort: Record<string, 1 | -1> =
    query.sort === "lowPrice"
      ? { _listingPrice: 1, _id: -1 }
      : query.sort === "highPrice"
        ? { _listingPrice: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };
  const [result] = await Product.aggregate([
    { $match: filter },
    ...listingStages(),
    ...(query.inStock ? [{ $match: { _listingStock: { $gt: 0 } } }] : []),
    {
      $facet: {
        count: [{ $count: "total" }],
        products: [
          { $sort: sort },
          { $skip: (query.page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          { $unset: ["_activeVariants", "_listingPrice", "_listingStock"] },
        ],
      },
    },
  ]);
  await Product.populate(result.products, [
    { path: "comments", match: { verified: true } },
    { path: "category" },
    { path: "tags" },
  ]);
  return JSON.parse(
    JSON.stringify({
      products: result.products,
      tags,
      total: result.count[0]?.total || 0,
    }),
  ) as { products: ProductType[]; tags: ProductTagFacet[]; total: number };
}
