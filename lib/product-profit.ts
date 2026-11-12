type PurchasePrices = ReadonlyMap<string, number> | Record<string, number>;

type ProductCost = {
  purchasePrices?: PurchasePrices;
  purchasePricesUpdatedAt?: Date;
};

type InventoryLine = {
  _id?: unknown;
  price: number;
  discountPrice?: number | null;
  stock?: number;
  isActive?: boolean;
};

type InventoryProduct = InventoryLine & ProductCost & {
  productType?: string;
  variants?: InventoryLine[];
};

export function isPurchasePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function getPurchasePrice(product: ProductCost | undefined, variantId?: unknown) {
  const prices = product?.purchasePrices;
  const key = variantId ? String(variantId) : "single";
  const price = prices instanceof Map
    ? prices.get(key)
    : (prices as Record<string, number> | undefined)?.[key];
  return isPurchasePrice(price) ? price : null;
}

export function summarizeProductInventory(product: InventoryProduct) {
  const multi = product.productType === "multi";
  const lines = multi ? product.variants ?? [] : [product];
  let missingPurchasePrice = lines.length === 0;
  let inventoryProfit = 0;
  let inventoryValue = 0;
  let stock = 0;

  for (const line of lines) {
    const purchasePrice = getPurchasePrice(product, multi ? line._id : undefined);
    if (purchasePrice === null) missingPurchasePrice = true;
    if (line.isActive === false) continue;

    const quantity = Number(line.stock || 0);
    const sellingPrice = Number((line.discountPrice ?? line.price) || 0);
    stock += quantity;
    inventoryValue += sellingPrice * quantity;
    if (purchasePrice !== null) inventoryProfit += (sellingPrice - purchasePrice) * quantity;
  }

  if (!lines.length) {
    stock = Number(product.stock || 0);
    inventoryValue = Number((product.discountPrice ?? product.price) || 0) * stock;
  }

  return {
    missingPurchasePrice,
    inventoryProfit: missingPurchasePrice ? null : inventoryProfit,
    inventoryValue,
    stock,
  };
}

export function summarizeInventory(products: Iterable<InventoryProduct>) {
  const totals = {
    knownInventoryProfit: 0,
    missingPurchasePriceProducts: 0,
    inventoryValue: 0,
    lowStockProducts: 0,
  };
  for (const product of products) {
    const row = summarizeProductInventory(product);
    totals.knownInventoryProfit += row.inventoryProfit ?? 0;
    if (row.missingPurchasePrice) totals.missingPurchasePriceProducts++;
    totals.inventoryValue += row.inventoryValue;
    if (row.stock < 5) totals.lowStockProducts++;
  }
  return totals;
}

type SaleLine = { quantity: number };

export function calculateSaleProfit(
  lines: readonly SaleLine[] | undefined,
  prices: readonly (number | null)[] | undefined,
  merchandiseRevenue: number,
) {
  if (!lines?.length || prices?.length !== lines.length || !isPurchasePrice(merchandiseRevenue)) {
    return null;
  }

  let cost = 0;
  for (const [index, line] of lines.entries()) {
    const price = prices[index];
    if (!isPurchasePrice(price) || !isPurchasePrice(line.quantity) || line.quantity === 0) return null;
    cost += price * line.quantity;
    if (!Number.isSafeInteger(cost)) return null;
  }
  return merchandiseRevenue - cost;
}

type WebsiteSale = {
  status?: string;
  paymentStatus?: string;
  totalPrice: number;
  couponDiscount?: number | null;
  items?: SaleLine[];
  salePurchasePrices?: (number | null)[];
};

export function websiteSaleProfit(order: WebsiteSale) {
  if (order.paymentStatus !== "paid" || order.status === "cancelled") return null;
  return calculateSaleProfit(
    order.items,
    order.salePurchasePrices,
    order.totalPrice - (order.couponDiscount ?? 0),
  );
}

export function posPurchasePriceSnapshot(
  product: ProductCost,
  variantId: unknown,
  soldAt: Date,
) {
  const price = getPurchasePrice(product, variantId);
  const effectiveAt = product.purchasePricesUpdatedAt;
  return {
    price,
    estimated: price !== null && (!effectiveAt || effectiveAt > soldAt),
  };
}

// Use the same sellable identities for the catalog filter and the inventory summary.
export const missingPurchasePriceExpression = {
  $let: {
    vars: {
      requiredKeys: {
        $cond: [
          { $eq: ["$productType", "multi"] },
          {
            $map: {
              input: { $ifNull: ["$variants", []] },
              as: "variant",
              in: { $toString: "$$variant._id" },
            },
          },
          ["single"],
        ],
      },
      pricedKeys: {
        $map: {
          input: { $objectToArray: { $ifNull: ["$purchasePrices", {}] } },
          as: "price",
          in: "$$price.k",
        },
      },
    },
    in: {
      $or: [
        { $eq: [{ $size: "$$requiredKeys" }, 0] },
        { $not: [{ $setIsSubset: ["$$requiredKeys", "$$pricedKeys"] }] },
      ],
    },
  },
};
