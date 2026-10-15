import { Types } from "mongoose";

import dbConnect from "@/lib/mongodb";
import {
  POS_CATALOG_READ_SCOPE,
  requirePosDeviceScope,
} from "@/lib/pos/auth";
import {
  handleCatalogSnapshotRequest,
  type CatalogPageFetch,
} from "@/lib/pos/catalogSnapshot";
import { configuredPosCredentialVerifier } from "@/lib/pos/serverAuth";
import "@/model/Category";
import Product from "@/model/Product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const fetchCatalogPage: CatalogPageFetch = async ({ afterId, limit }) => {
  await dbConnect();

  const filter = {
    status: { $in: ["draft", "published"] },
    deletedAt: null,
    ...(afterId
      ? {
          _id: {
            $gt: new Types.ObjectId(afterId),
          },
        }
      : {}),
  };

  return Product.find(filter)
    .select(
      [
        "_id",
        "title",
        "slug",
        "sku",
        "status",
        "productType",
        "price",
        "discountPrice",
        "stock",
        "category",
        "mainImage",
        "catalogRevision",
        "inventoryVersion",
        "deletedAt",
        "createdAt",
        "updatedAt",
        "variants._id",
        "variants.title",
        "variants.sku",
        "variants.price",
        "variants.discountPrice",
        "variants.stock",
      ].join(" "),
    )
    .populate({ path: "category", select: "_id name" })
    .sort({ _id: 1 })
    .limit(limit)
    .lean();
};

export async function GET(request: Request): Promise<Response> {
  return handleCatalogSnapshotRequest(request, {
    authorize: (incomingRequest) =>
      requirePosDeviceScope(
        incomingRequest,
        POS_CATALOG_READ_SCOPE,
        configuredPosCredentialVerifier,
      ),
    fetchPage: fetchCatalogPage,
  });
}
