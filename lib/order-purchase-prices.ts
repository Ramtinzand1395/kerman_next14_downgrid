import type { ClientSession } from "mongoose";
import Product from "@/model/Product";
import { getPurchasePrice } from "@/lib/product-profit";

type OrderLine = { product: unknown; variantId?: unknown };

export async function snapshotOrderPurchasePrices(
  items: readonly OrderLine[],
  session: ClientSession,
) {
  const ids = [...new Set(items.map((item) => String(item.product)))];
  const products = await Product.find({ _id: { $in: ids } })
    .select("_id purchasePrices")
    .session(session)
    .lean();
  const productsById = new Map(products.map((product: any) => [String(product._id), product]));
  return items.map((item) =>
    getPurchasePrice(productsById.get(String(item.product)), item.variantId),
  );
}
