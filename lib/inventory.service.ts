import mongoose from "mongoose";
import Product from "@/model/Product";

export interface InventoryItem {
  product: unknown;
  variantId?: unknown;
  quantity: number;
}

export class InsufficientStockError extends Error {
  constructor() {
    super("INSUFFICIENT_STOCK");
    this.name = "InsufficientStockError";
  }
}

export async function restoreInventory(
  items: InventoryItem[],
  session?: mongoose.ClientSession,
) {
  if (items.length === 0) return;

  await Product.bulkWrite(
    [...items].reverse().map((item) =>
      item.variantId
        ? {
            updateOne: {
              filter: { _id: item.product, "variants._id": item.variantId },
              update: {
                $inc: {
                  stock: item.quantity,
                  "variants.$.stock": item.quantity,
                },
              },
            },
          }
        : {
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: item.quantity } },
            },
          },
    ),
    { ordered: true, ...(session ? { session } : {}) },
  );
}

export async function decrementInventory(
  items: InventoryItem[],
  session?: mongoose.ClientSession,
): Promise<InventoryItem[]> {
  const decremented: InventoryItem[] = [];

  try {
    for (const item of items) {
      const options = session ? { session } : undefined;
      const updated = item.variantId
        ? await Product.findOneAndUpdate(
            {
              _id: item.product,
              stock: { $gte: item.quantity },
              variants: {
                $elemMatch: {
                  _id: item.variantId,
                  stock: { $gte: item.quantity },
                },
              },
            },
            {
              $inc: {
                stock: -item.quantity,
                "variants.$.stock": -item.quantity,
              },
            },
            options,
          )
        : await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            options,
          );

      if (!updated) throw new InsufficientStockError();
      decremented.push(item);
    }

    return decremented;
  } catch (error) {
    if (!session && decremented.length > 0) {
      await restoreInventory(decremented);
    }
    throw error;
  }
}

export function databaseSupportsTransactions() {
  const topologyType = (mongoose.connection.getClient() as unknown as {
    topology?: { description?: { type?: string } };
  }).topology?.description?.type;

  return topologyType !== "Single";
}
