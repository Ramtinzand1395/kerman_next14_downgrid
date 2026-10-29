import { MongoClient } from "mongodb";
import { normalizeCatalogIdentity } from "../lib/pos/catalog-identities.ts";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri);
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

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
          defaultVariantId: 1,
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
  const invalidDiscountRelationships = [];
  const unstableVariantIds = [];
  const invalidDefaultVariantIds = [];
  const inconsistentDerivedInventory = [];
  const inconsistentDerivedPricing = [];
  const invalidProductShapes = [];
  const softDeletedPublishedProducts = [];
  let variantCount = 0;
  let missingProductSku = 0;
  let missingSingleBarcode = 0;
  let missingVariantSku = 0;
  let missingVariantBarcode = 0;

  for (const product of products) {
    const productLocation = location(product);
    addIdentity(skuLocations, product.sku, location(product));
    addIdentity(barcodeLocations, product.barcode, location(product));
    if (!normalizeCatalogIdentity(product.sku)) missingProductSku += 1;
    if (
      product.productType !== "multi" &&
      !normalizeCatalogIdentity(product.barcode)
    ) {
      missingSingleBarcode += 1;
    }
    if (product.deletedAt != null && product.status === "published") {
      softDeletedPublishedProducts.push(productLocation);
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
    } else if (
      product.discountPrice != null &&
      isIntegerMoney(product.price) &&
      product.discountPrice > product.price
    ) {
      invalidDiscountRelationships.push({
        ...productLocation,
        price: product.price,
        discountPrice: product.discountPrice,
      });
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (product.productType === "multi" && variants.length === 0) {
      invalidProductShapes.push({
        ...productLocation,
        reason: "multi_without_variants",
      });
    }
    if (product.productType !== "multi" && variants.length > 0) {
      invalidProductShapes.push({
        ...productLocation,
        reason: "single_with_variants",
      });
    }

    const seenVariantIds = new Set();
    for (const variant of variants) {
      variantCount += 1;
      const variantLocation = location(product, variant);
      const variantId = variant?._id ? String(variant._id) : "";
      if (!OBJECT_ID_PATTERN.test(variantId)) {
        unstableVariantIds.push({
          ...variantLocation,
          reason: "missing_or_invalid_object_id",
        });
      } else if (seenVariantIds.has(variantId.toLowerCase())) {
        unstableVariantIds.push({
          ...variantLocation,
          reason: "duplicate_variant_id_within_product",
        });
      } else {
        seenVariantIds.add(variantId.toLowerCase());
      }
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
      } else if (
        variant.discountPrice != null &&
        isIntegerMoney(variant.price) &&
        variant.discountPrice > variant.price
      ) {
        invalidDiscountRelationships.push({
          ...variantLocation,
          price: variant.price,
          discountPrice: variant.discountPrice,
        });
      }
    }

    if (product.productType === "multi") {
      const activeVariants = variants.filter(
        (variant) => variant?.isActive !== false,
      );
      const activeIds = new Set(
        activeVariants
          .map((variant) => (variant?._id ? String(variant._id).toLowerCase() : ""))
          .filter(Boolean),
      );
      const defaultVariantId = product.defaultVariantId
        ? String(product.defaultVariantId).toLowerCase()
        : null;
      if (defaultVariantId && !activeIds.has(defaultVariantId)) {
        invalidDefaultVariantIds.push({
          ...productLocation,
          defaultVariantId,
          reason: "default_variant_missing_or_inactive",
        });
      }

      const activeStocks = activeVariants.map((variant) => variant.stock);
      if (activeStocks.every(isIntegerMoney)) {
        const derivedStock = activeStocks.reduce((sum, value) => sum + value, 0);
        if (!Number.isSafeInteger(derivedStock) || derivedStock !== product.stock) {
          inconsistentDerivedInventory.push({
            ...productLocation,
            storedStock: product.stock,
            derivedStock: Number.isSafeInteger(derivedStock) ? derivedStock : null,
          });
        }
      }

      if (
        activeVariants.length > 0 &&
        activeVariants.every(
          (variant) =>
            isIntegerMoney(variant.price) &&
            (variant.discountPrice == null || isIntegerMoney(variant.discountPrice)),
        )
      ) {
        const derivedPrice = Math.min(
          ...activeVariants.map((variant) => variant.price),
        );
        const derivedEffectivePrice = Math.min(
          ...activeVariants.map(
            (variant) => variant.discountPrice ?? variant.price,
          ),
        );
        const derivedDiscountPrice =
          derivedEffectivePrice < derivedPrice ? derivedEffectivePrice : null;
        if (
          product.price !== derivedPrice ||
          (product.discountPrice ?? null) !== derivedDiscountPrice
        ) {
          inconsistentDerivedPricing.push({
            ...productLocation,
            storedPrice: product.price,
            storedDiscountPrice: product.discountPrice ?? null,
            derivedPrice,
            derivedDiscountPrice,
          });
        }
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
      invalidDiscountRelationshipCount: invalidDiscountRelationships.length,
      unstableVariantIdCount: unstableVariantIds.length,
      invalidDefaultVariantIdCount: invalidDefaultVariantIds.length,
      inconsistentDerivedInventoryCount: inconsistentDerivedInventory.length,
      inconsistentDerivedPricingCount: inconsistentDerivedPricing.length,
      invalidProductShapeCount: invalidProductShapes.length,
      softDeletedPublishedCount: softDeletedPublishedProducts.length,
    },
    duplicateSkus: duplicateGroups(skuLocations),
    duplicateBarcodes: duplicateGroups(barcodeLocations),
    invalidNumericFields,
    invalidDiscountRelationships,
    unstableVariantIds,
    invalidDefaultVariantIds,
    inconsistentDerivedInventory,
    inconsistentDerivedPricing,
    invalidProductShapes,
    softDeletedPublishedProducts,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await client.close();
}
