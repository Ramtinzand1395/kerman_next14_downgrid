import Product from "@/model/Product";
import {
  collectCatalogIdentities,
  type CatalogIdentitySet,
} from "@/lib/pos/catalog-identities";

export type CatalogIdentityConflict = {
  kind: "sku" | "barcode";
  value: string;
  productId: string;
};

export async function findCatalogIdentityConflict(
  identities: CatalogIdentitySet,
  excludeProductId?: string,
): Promise<CatalogIdentityConflict | null> {
  if (identities.skus.length === 0 && identities.barcodes.length === 0) {
    return null;
  }

  const clauses: Record<string, unknown>[] = [];
  if (identities.skus.length > 0) {
    clauses.push(
      { sku: { $in: identities.skus } },
      { "variants.sku": { $in: identities.skus } },
    );
  }
  if (identities.barcodes.length > 0) {
    clauses.push(
      { barcode: { $in: identities.barcodes } },
      { "variants.barcode": { $in: identities.barcodes } },
    );
  }

  const document = await Product.findOne({
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
    $or: clauses,
  })
    .collation({ locale: "en", strength: 2 })
    .select("_id sku barcode variants.sku variants.barcode")
    .lean();

  if (!document) return null;
  const existing = collectCatalogIdentities(document);
  const requestedSkus = new Set(identities.skus);
  const requestedBarcodes = new Set(identities.barcodes);
  const conflictingSku = existing.skus.find((value) => requestedSkus.has(value));
  if (conflictingSku) {
    return {
      kind: "sku",
      value: conflictingSku,
      productId: String(document._id),
    };
  }
  const conflictingBarcode = existing.barcodes.find((value) =>
    requestedBarcodes.has(value),
  );
  return conflictingBarcode
    ? {
        kind: "barcode",
        value: conflictingBarcode,
        productId: String(document._id),
      }
    : null;
}
