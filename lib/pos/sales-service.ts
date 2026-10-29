import mongoose, { type ClientSession } from "mongoose";
import dbConnect from "../mongodb.ts";
import Product from "../../model/Product.ts";
import PosInventoryMovement from "../../model/PosInventoryMovement.ts";
import PosSale from "../../model/PosSale.ts";
import { appendCatalogChange, runCatalogTransaction } from "./catalog-outbox.ts";
import {
  createPosPriceSnapshot,
  fingerprintPosSaleRequest,
  isLateOfflineSale,
  validatePosSaleRequest,
  type ValidatedPosSaleItem,
  type ValidatedPosSaleRequest,
} from "./sales-contract.ts";
import {
  PosSaleConflictError,
  PosSaleIdempotencyConflictError,
  type PosSaleConflictDetail,
} from "./sales-errors.ts";

const PRODUCT_FIELDS = [
  "_id",
  "title",
  "sku",
  "barcode",
  "productType",
  "status",
  "deletedAt",
  "price",
  "discountPrice",
  "stock",
  "variants",
  "catalogRevision",
  "inventoryVersion",
].join(" ");

type ReviewReason = "offline_delay" | "price_mismatch" | "catalog_state";

export type PosSaleResponse = {
  saleId: string;
  deviceId: string;
  siteSaleId: string;
  invoiceNumber: string;
  soldAtUtc: string;
  syncedAtUtc: string;
  items: Array<Record<string, unknown>>;
  finalAmountToman: number;
  paymentMethods: Array<Record<string, unknown>>;
  customer: Record<string, unknown> | null;
  cashier: Record<string, unknown>;
  syncStatus: "synced" | "review_required";
  reviewReasons: ReviewReason[];
};

type SaleResult = { sale: PosSaleResponse; replayed: boolean };

function plain(value: unknown): any {
  if (value && typeof value === "object" && "toObject" in value) {
    return (value as { toObject: (options?: object) => unknown }).toObject({
      depopulate: true,
    });
  }
  return value;
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeCatalogInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function saleDto(document: unknown): PosSaleResponse {
  const sale = plain(document);
  return {
    saleId: String(sale.saleId),
    deviceId: String(sale.deviceId),
    siteSaleId: String(sale.siteSaleId),
    invoiceNumber: String(sale.invoiceNumber),
    soldAtUtc: iso(sale.soldAtUtc),
    syncedAtUtc: iso(sale.syncedAtUtc),
    items: (sale.items ?? []).map((item: unknown) => {
      const value = plain(item);
      return {
        productId: String(value.productId),
        variantId: value.variantId ? String(value.variantId) : null,
        productName: String(value.productName ?? ""),
        variantName: optionalString(value.variantName),
        sku: optionalString(value.sku),
        barcode: optionalString(value.barcode),
        productType: value.productType,
        quantity: value.quantity,
        unitPriceToman: value.unitPriceToman,
        discountToman: value.discountToman,
        finalAmountToman: value.finalAmountToman,
        priceSnapshot: plain(value.priceSnapshot),
        inventorySnapshot: plain(value.inventorySnapshot),
      };
    }),
    finalAmountToman: sale.finalAmountToman,
    paymentMethods: (sale.paymentMethods ?? []).map((payment: unknown) => {
      const value = plain(payment);
      return {
        method: value.method,
        amountToman: value.amountToman,
        reference: optionalString(value.reference),
      };
    }),
    customer: sale.customer ? plain(sale.customer) : null,
    cashier: plain(sale.cashier),
    syncStatus: sale.syncStatus,
    reviewReasons: [...(sale.reviewReasons ?? [])],
  };
}

async function existingSale(
  deviceId: string,
  saleId: string,
  session?: ClientSession,
) {
  let query = PosSale.findOne({ deviceId, saleId }).select("+requestHash");
  if (session) query = query.session(session);
  return query;
}

function matchExisting(document: any, requestHash: string): SaleResult {
  if (document.requestHash !== requestHash) {
    throw new PosSaleIdempotencyConflictError();
  }
  return { sale: saleDto(document), replayed: true };
}

function catalogConflict(
  item: ValidatedPosSaleItem,
  reason: PosSaleConflictDetail["reason"],
) {
  return new PosSaleConflictError("POS_SALE_CATALOG_CONFLICT", [
    { productId: item.productId, variantId: item.variantId, reason },
  ]);
}

function getSellableTarget(product: any, item: ValidatedPosSaleItem) {
  if (product.productType === "multi") {
    if (!item.variantId) throw catalogConflict(item, "variant_required");
    const variant = (product.variants ?? []).find(
      (candidate: any) => String(candidate._id) === item.variantId,
    );
    if (!variant) throw catalogConflict(item, "variant_not_found");
    return variant;
  }
  if (item.variantId) throw catalogConflict(item, "variant_not_allowed");
  return product;
}

function readPrices(target: any, item: ValidatedPosSaleItem) {
  const base = safeCatalogInteger(target.price);
  const rawDiscount = target.discountPrice;
  const discounted =
    rawDiscount === null || rawDiscount === undefined
      ? null
      : safeCatalogInteger(rawDiscount);
  if (base === null || (rawDiscount != null && discounted === null) || (discounted !== null && discounted > base)) {
    throw catalogConflict(item, "invalid_catalog_data");
  }
  return { base, discounted };
}

function productKey(item: ValidatedPosSaleItem) {
  return item.productId;
}

async function createSaleInTransaction(input: {
  request: ValidatedPosSaleRequest;
  requestHash: string;
  deviceId: string;
  syncedAt: Date;
  saleObjectId: mongoose.Types.ObjectId;
  session: ClientSession;
}): Promise<SaleResult> {
  const existing = await existingSale(
    input.deviceId,
    input.request.saleId,
    input.session,
  );
  if (existing) return matchExisting(existing, input.requestHash);

  const productIds = [...new Set(input.request.items.map(productKey))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select(PRODUCT_FIELDS)
    .session(input.session);
  const productsById = new Map(products.map((product: any) => [String(product._id), product]));

  const missing = input.request.items
    .filter((item) => !productsById.has(item.productId))
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      reason: "product_not_found" as const,
    }));
  if (missing.length) {
    throw new PosSaleConflictError("POS_SALE_CATALOG_CONFLICT", missing);
  }

  const reviewReasons = new Set<ReviewReason>();
  if (isLateOfflineSale(input.request.soldAtUtc, input.syncedAt)) {
    reviewReasons.add("offline_delay");
  }

  const lineStates: Array<{
    item: ValidatedPosSaleItem;
    product: any;
    target: any;
    parentStockBefore: number;
    itemStockBefore: number;
    inventoryVersionBefore: number;
    catalogRevision: number;
    priceSnapshot: ReturnType<typeof createPosPriceSnapshot>;
  }> = [];

  for (const item of input.request.items) {
    const product: any = productsById.get(item.productId);
    const target = getSellableTarget(product, item);
    const itemStock = safeCatalogInteger(target.stock);
    const parentStock = safeCatalogInteger(product.stock);
    const inventoryVersion = safeCatalogInteger(product.inventoryVersion);
    const catalogRevision = safeCatalogInteger(product.catalogRevision);
    if (
      itemStock === null ||
      parentStock === null ||
      inventoryVersion === null ||
      catalogRevision === null
    ) {
      throw catalogConflict(item, "invalid_catalog_data");
    }
    if (item.quantity > itemStock) {
      throw new PosSaleConflictError("POS_SALE_INVENTORY_CONFLICT", [
        {
          productId: item.productId,
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          availableQuantity: itemStock,
          reason: "insufficient_stock",
        },
      ]);
    }
    const prices = readPrices(target, item);
    const priceSnapshot = createPosPriceSnapshot({
      siteBasePriceToman: prices.base,
      siteDiscountedPriceToman: prices.discounted,
      posUnitPriceToman: item.unitPriceToman,
      posDiscountToman: item.discountToman,
    });
    if (priceSnapshot.mismatch) reviewReasons.add("price_mismatch");
    if (
      product.status !== "published" ||
      product.deletedAt ||
      (product.productType === "multi" && target.isActive === false)
    ) {
      reviewReasons.add("catalog_state");
    }
    lineStates.push({
      item,
      product,
      target,
      parentStockBefore: parentStock,
      itemStockBefore: itemStock,
      inventoryVersionBefore: inventoryVersion,
      catalogRevision,
      priceSnapshot,
    });
    target.stock = itemStock - item.quantity;
  }

  for (const product of products) {
    const beforeVersion = safeCatalogInteger((product as any).inventoryVersion);
    if (beforeVersion === null || beforeVersion === Number.MAX_SAFE_INTEGER) {
      const item = input.request.items.find((candidate) => candidate.productId === String(product._id))!;
      throw catalogConflict(item, "invalid_catalog_data");
    }
    (product as any).inventoryVersion = beforeVersion + 1;
    await product.save({ session: input.session });
    await appendCatalogChange(
      {
        product: product as any,
        eventType: "updated",
        changes: ["inventory"],
        source: "pos",
        idempotencyKey: `pos-sale:${input.deviceId}:${input.request.saleId}:${String(product._id)}`,
      },
      input.session,
    );
  }

  const siteSaleId = input.saleObjectId.toHexString();
  const invoiceNumber = `POS-${siteSaleId.toUpperCase()}`;
  const audit = {
    source: "pos",
    deviceId: input.deviceId,
    referenceId: `${input.deviceId}:${input.request.saleId}`,
  };
  const saleItems = lineStates.map((state) => {
    const parentStockAfter = safeCatalogInteger(state.product.stock);
    const itemStockAfter = safeCatalogInteger(state.target.stock);
    const inventoryVersionAfter = safeCatalogInteger(state.product.inventoryVersion);
    if (parentStockAfter === null || itemStockAfter === null || inventoryVersionAfter === null) {
      throw catalogConflict(state.item, "invalid_catalog_data");
    }
    return {
      productId: state.product._id,
      variantId: state.item.variantId ? new mongoose.Types.ObjectId(state.item.variantId) : null,
      productName: String(state.product.title ?? ""),
      variantName: state.item.variantId ? optionalString(state.target.title) : null,
      sku: optionalString(state.target.sku),
      barcode: optionalString(state.target.barcode),
      productType: state.product.productType === "multi" ? "multi" : "single",
      quantity: state.item.quantity,
      unitPriceToman: state.item.unitPriceToman,
      discountToman: state.item.discountToman,
      finalAmountToman: state.item.finalAmountToman,
      priceSnapshot: {
        ...state.priceSnapshot,
        catalogRevision: state.catalogRevision,
        inventoryVersionBefore: state.inventoryVersionBefore,
      },
      inventorySnapshot: {
        itemStockBefore: state.itemStockBefore,
        itemStockAfter,
        parentStockBefore: state.parentStockBefore,
        parentStockAfter,
        inventoryVersionAfter,
      },
    };
  });

  const [sale] = await PosSale.create(
    [
      {
        _id: input.saleObjectId,
        saleId: input.request.saleId,
        deviceId: input.deviceId,
        siteSaleId,
        invoiceNumber,
        requestHash: input.requestHash,
        soldAtUtc: new Date(input.request.soldAtUtc),
        syncedAtUtc: input.syncedAt,
        items: saleItems,
        finalAmountToman: input.request.finalAmountToman,
        paymentMethods: input.request.paymentMethods,
        customer: input.request.customer,
        cashier: input.request.cashier,
        syncStatus: reviewReasons.size ? "review_required" : "synced",
        reviewReasons: [...reviewReasons].sort(),
        audit,
      },
    ],
    { session: input.session, ordered: true },
  );

  await PosInventoryMovement.create(
    saleItems.map((item, index) => ({
      movementType: "pos_sale",
      posSale: sale._id,
      siteSaleId,
      saleId: input.request.saleId,
      deviceId: input.deviceId,
      itemIndex: index,
      productId: item.productId,
      variantId: item.variantId,
      quantityDelta: -item.quantity,
      itemStockBefore: item.inventorySnapshot.itemStockBefore,
      itemStockAfter: item.inventorySnapshot.itemStockAfter,
      parentStockBefore: item.inventorySnapshot.parentStockBefore,
      parentStockAfter: item.inventorySnapshot.parentStockAfter,
      inventoryVersionBefore: item.priceSnapshot.inventoryVersionBefore,
      inventoryVersionAfter: item.inventorySnapshot.inventoryVersionAfter,
      occurredAtUtc: new Date(input.request.soldAtUtc),
      recordedAtUtc: input.syncedAt,
      audit,
    })),
    { session: input.session, ordered: true },
  );

  return { sale: saleDto(sale), replayed: false };
}

export { PosSaleConflictError, PosSaleIdempotencyConflictError };

export async function registerPosSale(
  rawRequest: unknown,
  context: { deviceId: string },
  options: { now?: Date } = {},
): Promise<SaleResult> {
  const request = validatePosSaleRequest(rawRequest);
  const deviceId = context.deviceId.trim();
  if (!deviceId) throw new Error("POS_DEVICE_ID_REQUIRED");
  const requestHash = fingerprintPosSaleRequest(request);
  const syncedAt = options.now ?? new Date();
  const saleObjectId = new mongoose.Types.ObjectId();

  await dbConnect();
  const existing = await existingSale(deviceId, request.saleId);
  if (existing) return matchExisting(existing, requestHash);

  try {
    return await runCatalogTransaction((session) =>
      createSaleInTransaction({
        request,
        requestHash,
        deviceId,
        syncedAt,
        saleObjectId,
        session,
      }),
    );
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const raced = await existingSale(deviceId, request.saleId);
    if (!raced) throw error;
    return matchExisting(raced, requestHash);
  }
}
