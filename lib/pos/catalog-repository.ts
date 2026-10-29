import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import PosCatalogCounter from "@/model/PosCatalogCounter";
import mongoose from "mongoose";
import {
  CATALOG_VISIBLE_MATCH,
  createCatalogSnapshotPage,
  type CatalogPagination,
  type CatalogProductSource,
  type CatalogSnapshotPage,
} from "./catalog";
import {
  encodeCatalogChangesCursor,
  POS_CATALOG_COUNTER_KEY,
} from "./catalog-changes";

const CATALOG_SNAPSHOT_PROJECTION = [
  "_id",
  "title",
  "slug",
  "sku",
  "barcode",
  "productType",
  "category",
  "mainImage",
  "status",
  "price",
  "discountPrice",
  "stock",
  "variants",
  "defaultVariantId",
  "variantSelector",
  "catalogRevision",
  "inventoryVersion",
  "createdAt",
  "updatedAt",
].join(" ");

export async function getCatalogSnapshotPage(
  pagination: CatalogPagination,
): Promise<CatalogSnapshotPage> {
  await dbConnect();
  // Capture the durable outbox high-water mark before reading products. Any
  // concurrent mutation commits at a larger sequence and is replayed later.
  const counter = await PosCatalogCounter.findOne({
    key: POS_CATALOG_COUNTER_KEY,
  })
    .select("value")
    .lean();
  const syncCursor = encodeCatalogChangesCursor(Number(counter?.value ?? 0));
  const filter = {
    ...CATALOG_VISIBLE_MATCH,
    ...(pagination.cursorId
      ? { _id: { $gt: new mongoose.Types.ObjectId(pagination.cursorId) } }
      : {}),
  };

  const documents = await Product.find(filter)
    .select(CATALOG_SNAPSHOT_PROJECTION)
    .populate({ path: "category", select: "_id name slug" })
    .sort({ _id: 1 })
    .limit(pagination.limit + 1)
    .lean();

  return {
    ...createCatalogSnapshotPage(
    documents as unknown as CatalogProductSource[],
    pagination.limit,
    ),
    syncCursor,
  };
}
