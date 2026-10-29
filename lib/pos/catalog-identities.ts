export type CatalogIdentitySet = {
  skus: string[];
  barcodes: string[];
};

type CatalogIdentitySource = {
  sku?: unknown;
  barcode?: unknown;
  variants?: unknown;
};

export function normalizeCatalogIdentity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function collectCatalogIdentities(
  source: CatalogIdentitySource,
): CatalogIdentitySet {
  const skus = new Set<string>();
  const barcodes = new Set<string>();

  const parentSku = normalizeCatalogIdentity(source.sku);
  const parentBarcode = normalizeCatalogIdentity(source.barcode);
  if (parentSku) skus.add(parentSku);
  if (parentBarcode) barcodes.add(parentBarcode);

  if (Array.isArray(source.variants)) {
    for (const value of source.variants) {
      if (!value || typeof value !== "object") continue;
      const variant = value as { sku?: unknown; barcode?: unknown };
      const sku = normalizeCatalogIdentity(variant.sku);
      const barcode = normalizeCatalogIdentity(variant.barcode);
      if (sku) skus.add(sku);
      if (barcode) barcodes.add(barcode);
    }
  }

  return { skus: [...skus], barcodes: [...barcodes] };
}

export function differenceCatalogIdentities(
  next: CatalogIdentitySet,
  previous?: CatalogIdentitySet,
): CatalogIdentitySet {
  if (!previous) return next;
  const previousSkus = new Set(previous.skus);
  const previousBarcodes = new Set(previous.barcodes);
  return {
    skus: next.skus.filter((value) => !previousSkus.has(value)),
    barcodes: next.barcodes.filter(
      (value) => !previousBarcodes.has(value),
    ),
  };
}
