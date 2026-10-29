import mongoose, { type ClientSession } from "mongoose";
import dbConnect from "../mongodb.ts";
import Product from "../../model/Product.ts";
import "../../model/Category.ts";
import PosCatalogChange from "../../model/PosCatalogChange.ts";
import PosCatalogCounter from "../../model/PosCatalogCounter.ts";
import { isCatalogProductVisible, mapCatalogProduct } from "./catalog.ts";
import {
  detectCatalogChangeKinds,
  executeAtomicCatalogMutation,
  POS_CATALOG_COUNTER_KEY,
  type CatalogChangeEventType,
  type CatalogChangeKind,
} from "./catalog-changes.ts";

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
  | "pos"
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

type InventoryAdjustmentBatchOptions = {
  afterAdjustments?: (
    session: ClientSession,
    products: ProductDocument[],
  ) => Promise<void>;
};

class InventoryAdjustmentUnavailableError extends Error {
  constructor() {
    super("POS_CATALOG_INVENTORY_UNAVAILABLE");
    this.name = "InventoryAdjustmentUnavailableError";
  }
}

function validateInventoryAdjustment(input: InventoryAdjustmentInput) {
  if (!Number.isSafeInteger(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error("POS_CATALOG_INVALID_INVENTORY_DELTA");
  }
  if (
    input.requireAvailable !== undefined &&
    (!Number.isSafeInteger(input.requireAvailable) || input.requireAvailable < 0)
  ) {
    throw new Error("POS_CATALOG_INVALID_REQUIRED_INVENTORY");
  }
}

export async function adjustProductInventoriesWithCatalogChange(
  inputs: readonly InventoryAdjustmentInput[],
  options: InventoryAdjustmentBatchOptions = {},
) {
  if (inputs.length === 0) return [];
  inputs.forEach(validateInventoryAdjustment);

  const idempotencyKeys = inputs
    .map((input) => input.idempotencyKey)
    .filter((key): key is string => Boolean(key));
  if (new Set(idempotencyKeys).size !== idempotencyKeys.length) {
    throw new Error("POS_CATALOG_DUPLICATE_IDEMPOTENCY_KEY");
  }

  try {
    return await runCatalogTransaction(async (session) => {
      if (idempotencyKeys.length > 0) {
        const existingCount = await PosCatalogChange.countDocuments({
          idempotencyKey: { $in: idempotencyKeys },
        }).session(session);
        if (existingCount > 0) {
          if (
            idempotencyKeys.length !== inputs.length ||
            existingCount !== idempotencyKeys.length
          ) {
            throw new Error("POS_CATALOG_PARTIAL_IDEMPOTENCY_STATE");
          }
          const replayedProducts = (await Product.find({
            _id: { $in: [...new Set(inputs.map((input) => input.productId))] },
          }).session(session)) as ProductDocument[];
          await options.afterAdjustments?.(session, replayedProducts);
          return replayedProducts;
        }
      }

      const updatedProducts: ProductDocument[] = [];
      for (const input of inputs) {
        const availability = input.requireAvailable;
        const filter: Record<string, unknown> = { _id: input.productId };
        if (input.quantityDelta < 0) {
          filter.status = "published";
          filter.deletedAt = null;
        }
        if (availability !== undefined) {
          filter.stock = { $gte: availability };
        }

        const increment: Record<string, number> = {
          stock: input.quantityDelta,
          inventoryVersion: 1,
        };

        if (input.variantId) {
          filter.productType = "multi";
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
        } else {
          filter.productType = { $ne: "multi" };
        }

        const product = (await Product.findOneAndUpdate(
          filter,
          { $inc: increment },
          { new: true, session, runValidators: true },
        )) as ProductDocument | null;
        if (!product) throw new InventoryAdjustmentUnavailableError();

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
        updatedProducts.push(product);
      }

      await options.afterAdjustments?.(session, updatedProducts);
      return updatedProducts;
    });
  } catch (error) {
    if (error instanceof InventoryAdjustmentUnavailableError) return null;

    const duplicate = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
    };
    if (
      duplicate.code === 11000 &&
      duplicate.keyPattern?.idempotencyKey &&
      idempotencyKeys.length === inputs.length
    ) {
      const existingCount = await PosCatalogChange.countDocuments({
        idempotencyKey: { $in: idempotencyKeys },
      });
      if (existingCount === idempotencyKeys.length) {
        return Product.find({
          _id: { $in: [...new Set(inputs.map((input) => input.productId))] },
        });
      }
    }
    throw error;
  }
}

export async function adjustProductInventoryWithCatalogChange(
  input: InventoryAdjustmentInput,
) {
  const products = await adjustProductInventoriesWithCatalogChange([input]);
  return products?.[0] ?? null;
}
