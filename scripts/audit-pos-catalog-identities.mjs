import { MongoClient } from "mongodb";
import { normalizeCatalogIdentity } from "../lib/pos/catalog-identities.ts";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri);

function isIntegerMoney(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function location(product, variant) {
  return {
    productId: String(product._id),
    variantId: variant?._id ? String(variant._id) : null,
    level: variant ? "variant" : "product",
    status: product.status ?? null,
    deleted: product.deletedAt != null,
  };
}

function addIdentity(map, value, identityLocation) {
  const normalized = normalizeCatalogIdentity(value);
  if (!normalized) return;
  const entries = map.get(normalized) ?? [];
  entries.push(identityLocation);
  map.set(normalized, entries);
}

try {
  await client.connect();
  const products = await client
    .db()
    .collection("products")
    .find(
      {},
      {
        projection: {
          _id: 1,
          status: 1,
          deletedAt: 1,
          productType: 1,
          sku: 1,
          barcode: 1,
          price: 1,
          discountPrice: 1,
          stock: 1,
          variants: 1,
        },
      },
    )
    .toArray();

  const skuLocations = new Map();
  const barcodeLocations = new Map();
  const invalidNumericFields = [];
  let variantCount = 0;
  let missingProductSku = 0;
  let missingSingleBarcode = 0;
  let missingVariantSku = 0;
  let missingVariantBarcode = 0;

  for (const product of products) {
    addIdentity(skuLocations, product.sku, location(product));
    addIdentity(barcodeLocations, product.barcode, location(product));
    if (!normalizeCatalogIdentity(product.sku)) missingProductSku += 1;
    if (
      product.productType !== "multi" &&
      !normalizeCatalogIdentity(product.barcode)
    ) {
      missingSingleBarcode += 1;
    }

    for (const field of ["price", "stock"]) {
      if (!isIntegerMoney(product[field])) {
        invalidNumericFields.push({
          ...location(product),
          field,
          valueType: typeof product[field],
        });
      }
    }
    if (
      product.discountPrice != null &&
      !isIntegerMoney(product.discountPrice)
    ) {
      invalidNumericFields.push({
        ...location(product),
        field: "discountPrice",
        valueType: typeof product.discountPrice,
      });
    }

    for (const variant of Array.isArray(product.variants)
      ? product.variants
      : []) {
      variantCount += 1;
      const variantLocation = location(product, variant);
      addIdentity(skuLocations, variant.sku, variantLocation);
      addIdentity(barcodeLocations, variant.barcode, variantLocation);
      if (!normalizeCatalogIdentity(variant.sku)) missingVariantSku += 1;
      if (!normalizeCatalogIdentity(variant.barcode)) missingVariantBarcode += 1;
      for (const field of ["price", "stock"]) {
        if (!isIntegerMoney(variant[field])) {
          invalidNumericFields.push({
            ...variantLocation,
            field,
            valueType: typeof variant[field],
          });
        }
      }
      if (
        variant.discountPrice != null &&
        !isIntegerMoney(variant.discountPrice)
      ) {
        invalidNumericFields.push({
          ...variantLocation,
          field: "discountPrice",
          valueType: typeof variant.discountPrice,
        });
      }
    }
  }

  const duplicateGroups = (map) =>
    [...map.entries()]
      .filter(([, entries]) => entries.length > 1)
      .map(([value, entries]) => ({ value, occurrences: entries }))
      .sort((left, right) => left.value.localeCompare(right.value));

  const report = {
    generatedAtUtc: new Date().toISOString(),
    readOnly: true,
    summary: {
      products: products.length,
      variants: variantCount,
      draftProducts: products.filter((product) => product.status !== "published")
        .length,
      deletedProducts: products.filter((product) => product.deletedAt != null)
        .length,
      missingProductSku,
      missingSingleBarcode,
      missingVariantSku,
      missingVariantBarcode,
      invalidNumericFieldCount: invalidNumericFields.length,
    },
    duplicateSkus: duplicateGroups(skuLocations),
    duplicateBarcodes: duplicateGroups(barcodeLocations),
    invalidNumericFields,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await client.close();
}
