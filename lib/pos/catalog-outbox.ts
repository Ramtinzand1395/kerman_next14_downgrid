import mongoose, { type ClientSession } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import PosCatalogChange from "@/model/PosCatalogChange";
import PosCatalogCounter from "@/model/PosCatalogCounter";
import { isCatalogProductVisible, mapCatalogProduct } from "./catalog";
import {
  detectCatalogChangeKinds,
  executeAtomicCatalogMutation,
  POS_CATALOG_COUNTER_KEY,
  type CatalogChangeEventType,
  type CatalogChangeKind,
} from "./catalog-changes";

const PRODUCT_EVENT_PROJECTION = [
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
  "deletedAt",
  "createdAt",
  "updatedAt",
].join(" ");

type ProductDocument = mongoose.Document & Record<string, any>;

export type CatalogMutationSource =
  | "admin"
  | "zarinpal"
  | "wallet"
  | "system";

export type AppendCatalogChangeInput = {
  product: ProductDocument;
  eventType: CatalogChangeEventType;
  changes: CatalogChangeKind[];
  source: CatalogMutationSource;
  idempotencyKey?: string;
  forceRemove?: boolean;
};

function positiveRetentionDays() {
  const configured = Number(process.env.POS_CATALOG_CHANGE_RETENTION_DAYS);
  return Number.isSafeInteger(configured) && configured > 0
    ? Math.min(configured, 3650)
    : 90;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

export async function runCatalogTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  await dbConnect();
  return mongoose.connection.transaction(operation, {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
  });
}

async function nextSequence(session: ClientSession) {
  const counter = await PosCatalogCounter.findOneAndUpdate(
    { key: POS_CATALOG_COUNTER_KEY },
    {
      $inc: { value: 1 },
      $setOnInsert: { key: POS_CATALOG_COUNTER_KEY },
    },
    { upsert: true, new: true, session, setDefaultsOnInsert: false },
  ).lean();
  const sequence = Number(counter?.value);
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("POS_CATALOG_SEQUENCE_INVALID");
  }
  return sequence;
}

async function loadEventSnapshot(productId: unknown, session: ClientSession) {
  const product = await Product.findById(productId)
    .select(PRODUCT_EVENT_PROJECTION)
    .populate({ path: "category", select: "_id name slug" })
    .session(session)
    .lean();

  if (!product || !isCatalogProductVisible(product as Record<string, unknown>)) {
    return null;
  }
  return mapCatalogProduct(product as any);
}

export async function appendCatalogChange(
  input: AppendCatalogChangeInput,
  session: ClientSession,
) {
  const productObject = input.product.toObject({ depopulate: true });
  const snapshot = input.forceRemove
    ? null
    : await loadEventSnapshot(productObject._id, session);
  const action = snapshot ? "upsert" : "remove";
  const sequence = await nextSequence(session);
  const occurredAt = new Date();
  const expiresAt = new Date(
    occurredAt.getTime() + positiveRetentionDays() * 24 * 60 * 60 * 1000,
  );

  const [event] = await PosCatalogChange.create(
    [
      {
        sequence,
        productId: productObject._id,
        eventType: input.eventType,
        changes: input.changes,
        action,
        snapshot,
        catalogRevision: nonNegativeInteger(productObject.catalogRevision),
        inventoryVersion: nonNegativeInteger(productObject.inventoryVersion),
        source: input.source,
        idempotencyKey: input.idempotencyKey ?? null,
        occurredAt,
        expiresAt,
      },
    ],
    { session },
  );
  return event;
}

export async function createProductWithCatalogChange(
  productData: Record<string, unknown>,
) {
  return executeAtomicCatalogMutation<ProductDocument, ClientSession>({
    transaction: runCatalogTransaction,
    mutate: async (session) => {
      const [product] = await Product.create([productData], { session });
      return product;
    },
    append: async (product, session) => {
      await appendCatalogChange(
        {
          product,
          eventType: "created",
          changes: ["catalog", "price", "variants", "inventory", "status"],
          source: "admin",
        },
        session,
      );
    },
  });
}

export async function saveProductWithCatalogChange(input: {
  product: ProductDocument;
  previous: Record<string, any>;
  source?: CatalogMutationSource;
}) {
  return executeAtomicCatalogMutation<ProductDocument, ClientSession>({
    transaction: runCatalogTransaction,
    mutate: async (session) => {
      input.product.$session(session);
      return input.product.save({ session });
    },
    append: async (updated, session) => {
      await appendCatalogChange(
        {
          product: updated,
          eventType: "updated",
          changes: detectCatalogChangeKinds(
            input.previous,
            updated.toObject({ depopulate: true }),
          ),
          source: input.source ?? "admin",
        },
        session,
      );
    },
  });
}

export async function softDeleteProductWithCatalogChange(productId: string) {
  return runCatalogTransaction(async (session) => {
    const product = await Product.findById(productId).session(session);
    if (!product) return null;
    if (product.deletedAt) return product;

    product.deletedAt = new Date();
    product.status = "draft";
    product.catalogRevision = nonNegativeInteger(product.catalogRevision) + 1;
    const deleted = await product.save({ session });
    await appendCatalogChange(
      {
        product: deleted,
        eventType: "deleted",
        changes: ["status"],
        source: "admin",
        forceRemove: true,
      },
      session,
    );
    return deleted;
  });
}

export type InventoryAdjustmentInput = {
  productId: string;
  variantId?: string;
  quantityDelta: number;
  requireAvailable?: number;
  source: Extract<CatalogMutationSource, "zarinpal" | "wallet" | "system">;
  idempotencyKey?: string;
};

export async function adjustProductInventoryWithCatalogChange(
  input: InventoryAdjustmentInput,
) {
  if (!Number.isSafeInteger(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error("POS_CATALOG_INVALID_INVENTORY_DELTA");
  }

  try {
    return await runCatalogTransaction(async (session) => {
      if (input.idempotencyKey) {
        const existing = await PosCatalogChange.exists({
          idempotencyKey: input.idempotencyKey,
        }).session(session);
        if (existing) {
          return Product.findById(input.productId).session(session);
        }
      }

      const availability = input.requireAvailable;
      const filter: Record<string, unknown> = { _id: input.productId };
      if (availability !== undefined) {
        filter.stock = { $gte: availability };
      }

      const increment: Record<string, number> = {
        stock: input.quantityDelta,
        inventoryVersion: 1,
      };

      if (input.variantId) {
        filter.variants = {
          $elemMatch: {
            _id: input.variantId,
            ...(availability !== undefined
              ? { stock: { $gte: availability } }
              : {}),
            isActive: { $ne: false },
          },
        };
        increment["variants.$.stock"] = input.quantityDelta;
      }

      const product = await Product.findOneAndUpdate(
        filter,
        { $inc: increment },
        { new: true, session, runValidators: true },
      );
      if (!product) return null;

      await appendCatalogChange(
        {
          product,
          eventType: "updated",
          changes: ["inventory"],
          source: input.source,
          idempotencyKey: input.idempotencyKey,
        },
        session,
      );
      return product;
    });
  } catch (error) {
    const duplicate = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
    };
    if (
      duplicate.code === 11000 &&
      duplicate.keyPattern?.idempotencyKey &&
      input.idempotencyKey
    ) {
      return Product.findById(input.productId);
    }
    throw error;
  }
}

