import { Types, type PipelineStage } from "mongoose";

export const MAX_RELATED_PRODUCTS = 4;

export type RelatedProductSource = {
  category?: unknown;
  tags?: unknown;
};

export type RelatedProductSelection = {
  productId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  tagIds: Types.ObjectId[];
};

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isValidRelatedProductId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

function toObjectId(value: unknown): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (!isValidRelatedProductId(value)) return null;
  return new Types.ObjectId(value);
}

export function createRelatedProductSelection(
  productId: string | Types.ObjectId,
  source: RelatedProductSource,
): RelatedProductSelection | null {
  const normalizedProductId = toObjectId(productId);
  if (!normalizedProductId) return null;

  const rawTags = Array.isArray(source.tags) ? source.tags : [];
  const uniqueTags = new Map<string, Types.ObjectId>();

  for (const rawTag of rawTags) {
    const tagId = toObjectId(rawTag);
    if (tagId) uniqueTags.set(tagId.toHexString(), tagId);
  }

  if (uniqueTags.size === 0) return null;

  const categoryId = toObjectId(source.category);

  return {
    productId: normalizedProductId,
    ...(categoryId ? { categoryId } : {}),
    tagIds: [...uniqueTags.values()],
  };
}

export function buildRelatedProductsPipeline(
  selection: RelatedProductSelection,
): PipelineStage[] {
  const match: Record<string, unknown> = {
    _id: { $ne: selection.productId },
    status: "published",
    // In MongoDB, equality with null matches both null and a missing field.
    deletedAt: null,
    tags: { $in: selection.tagIds },
  };

  if (selection.categoryId) match.category = selection.categoryId;

  return [
    { $match: match },
    {
      $set: {
        sharedTagCount: {
          $size: {
            $setIntersection: [
              { $ifNull: ["$tags", []] },
              selection.tagIds,
            ],
          },
        },
      },
    },
    { $match: { sharedTagCount: { $gt: 0 } } },
    { $sort: { sharedTagCount: -1, createdAt: -1, _id: 1 } },
    { $limit: MAX_RELATED_PRODUCTS },
    {
      $set: {
        cardActiveVariants: {
          $cond: [
            { $eq: ["$productType", "multi"] },
            {
              $filter: {
                input: { $ifNull: ["$variants", []] },
                as: "variant",
                cond: { $ne: ["$$variant.isActive", false] },
              },
            },
            [],
          ],
        },
      },
    },
    {
      $set: {
        cardVariantBasePrices: {
          $map: {
            input: "$cardActiveVariants",
            as: "variant",
            in: "$$variant.price",
          },
        },
        cardVariantEffectivePrices: {
          $map: {
            input: "$cardActiveVariants",
            as: "variant",
            in: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$$variant.discountPrice", null] },
                    { $lt: ["$$variant.discountPrice", "$$variant.price"] },
                  ],
                },
                "$$variant.discountPrice",
                "$$variant.price",
              ],
            },
          },
        },
      },
    },
    {
      $set: {
        cardPrice: {
          $cond: [
            { $gt: [{ $size: "$cardActiveVariants" }, 0] },
            { $min: "$cardVariantBasePrices" },
            "$price",
          ],
        },
        cardDiscountPrice: {
          $cond: [
            { $gt: [{ $size: "$cardActiveVariants" }, 0] },
            {
              $let: {
                vars: {
                  minimumBasePrice: { $min: "$cardVariantBasePrices" },
                  minimumEffectivePrice: {
                    $min: "$cardVariantEffectivePrices",
                  },
                },
                in: {
                  $cond: [
                    {
                      $lt: [
                        "$$minimumEffectivePrice",
                        "$$minimumBasePrice",
                      ],
                    },
                    "$$minimumEffectivePrice",
                    null,
                  ],
                },
              },
            },
            "$discountPrice",
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        mainImage: 1,
        price: "$cardPrice",
        discountPrice: "$cardDiscountPrice",
      },
    },
  ];
}
