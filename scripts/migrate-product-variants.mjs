#!/usr/bin/env node
/**
 * scripts/migrate-product-variants.mjs
 *
 * Migration & Integrity Tool for Kerman Atari Products & Variants.
 * - Standardizes variant schema (_id, title, sku, barcode, price, discountPrice, stock, isActive)
 * - Derives root price, discountPrice, and stock for multi-variant products
 * - Ensures catalogRevision, inventoryVersion, deletedAt fields exist for POS sync
 * - Defaults to DRY-RUN mode unless --apply is passed
 *
 * Usage:
 *   node scripts/migrate-product-variants.mjs              # Dry run (safe)
 *   node scripts/migrate-product-variants.mjs --dry-run    # Explicit dry run
 *   node scripts/migrate-product-variants.mjs --apply      # Apply changes to DB
 */

import { MongoClient, ObjectId } from "mongodb";
import fs from "node:fs";
import path from "node:path";

// Attempt to load .env.local or .env if present
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ Error: MONGODB_URI environment variable is missing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isApply = args.includes("--apply");
const isVerbose = args.includes("--verbose") || args.includes("-v");

console.log("=================================================");
console.log("  Kerman Atari - Product & Variant Migration Tool");
console.log(`  Mode: ${isApply ? "🚀 APPLY (Modifying database)" : "🔍 DRY RUN (Simulated, no changes written)"}`);
console.log("=================================================\n");

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

async function run() {
  try {
    await client.connect();
    const db = client.db();
    const productsColl = db.collection("products");

    const cursor = productsColl.find({});
    let totalScanned = 0;
    let singleCount = 0;
    let multiCount = 0;
    let totalVariants = 0;
    let productsNeedingUpdate = 0;
    const warnings = [];

    while (await cursor.hasNext()) {
      const product = await cursor.next();
      totalScanned++;

      const isMulti =
        product.productType === "multi" ||
        (Array.isArray(product.variants) && product.variants.length > 0);

      const updates = {};
      let needsUpdate = false;

      // Common POS revision metadata
      if (product.catalogRevision === undefined) {
        updates.catalogRevision = 0;
        needsUpdate = true;
      }
      if (product.inventoryVersion === undefined) {
        updates.inventoryVersion = 0;
        needsUpdate = true;
      }
      if (product.deletedAt === undefined) {
        updates.deletedAt = null;
        needsUpdate = true;
      }

      if (!isMulti) {
        singleCount++;
        // Clean single product pricing & stock
        const cleanPrice = Math.max(0, Math.round(Number(product.price || 0)));
        if (cleanPrice !== product.price) {
          updates.price = cleanPrice;
          needsUpdate = true;
        }

        let cleanDiscount = null;
        if (product.discountPrice !== null && product.discountPrice !== undefined) {
          const parsed = Math.max(0, Math.round(Number(product.discountPrice)));
          if (parsed < cleanPrice) {
            cleanDiscount = parsed;
          }
        }
        if (cleanDiscount !== product.discountPrice) {
          updates.discountPrice = cleanDiscount;
          needsUpdate = true;
        }

        const cleanStock = Math.max(0, Math.round(Number(product.stock || 0)));
        if (cleanStock !== product.stock) {
          updates.stock = cleanStock;
          needsUpdate = true;
        }
      } else {
        multiCount++;
        const rawVariants = Array.isArray(product.variants) ? product.variants : [];
        totalVariants += rawVariants.length;

        const normalizedVariants = [];
        let variantsChanged = false;

        for (let i = 0; i < rawVariants.length; i++) {
          const v = rawVariants[i];
          let vId = v._id;
          if (!vId) {
            vId = new ObjectId();
            variantsChanged = true;
          } else if (typeof vId === "string") {
            try {
              vId = new ObjectId(vId);
            } catch {
              vId = new ObjectId();
              variantsChanged = true;
            }
          }

          const vTitle = String(v.title || `مدل ${i + 1}`).trim();
          if (vTitle !== v.title) variantsChanged = true;

          const vSku = v.sku ? String(v.sku).trim() : `${product.sku || "PROD"}-V${i + 1}`;
          if (vSku !== v.sku) variantsChanged = true;

          const vPrice = Math.max(0, Math.round(Number(v.price || 0)));
          if (vPrice !== v.price) variantsChanged = true;

          let vDiscount = null;
          if (v.discountPrice !== null && v.discountPrice !== undefined) {
            const parsed = Math.max(0, Math.round(Number(v.discountPrice)));
            if (parsed < vPrice) {
              vDiscount = parsed;
            }
          }
          if (vDiscount !== v.discountPrice) variantsChanged = true;

          const vStock = Math.max(0, Math.round(Number(v.stock || 0)));
          if (vStock !== v.stock) variantsChanged = true;

          const vIsActive = v.isActive !== false;
          if (vIsActive !== v.isActive) variantsChanged = true;

          normalizedVariants.push({
            _id: vId,
            title: vTitle,
            sku: vSku,
            barcode: v.barcode ? String(v.barcode).trim() : undefined,
            price: vPrice,
            discountPrice: vDiscount,
            stock: vStock,
            isActive: vIsActive,
          });
        }

        if (variantsChanged || !Array.isArray(product.variants)) {
          updates.variants = normalizedVariants;
          needsUpdate = true;
        }

        // Derive multi-product pricing and aggregate stock
        const activeVariants = normalizedVariants.filter((v) => v.isActive);
        if (activeVariants.length === 0) {
          warnings.push(`⚠️ Product "${product.title}" (${product._id}) has NO active variants!`);
        }

        const derivedStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
        const basePrices = activeVariants.map((v) => v.price);
        const derivedBasePrice = basePrices.length > 0 ? Math.min(...basePrices) : 0;

        const effectivePrices = activeVariants.map((v) => v.discountPrice ?? v.price);
        const minEffective = effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0;
        const derivedDiscount = minEffective < derivedBasePrice ? minEffective : null;

        if (product.stock !== derivedStock) {
          updates.stock = derivedStock;
          needsUpdate = true;
        }
        if (product.price !== derivedBasePrice) {
          updates.price = derivedBasePrice;
          needsUpdate = true;
        }
        if (product.discountPrice !== derivedDiscount) {
          updates.discountPrice = derivedDiscount;
          needsUpdate = true;
        }

        // Default variant ID resolution
        let defaultVarId = product.defaultVariantId ? String(product.defaultVariantId) : null;
        const defaultVarExists = activeVariants.some((v) => String(v._id) === defaultVarId);
        if (!defaultVarExists && activeVariants.length > 0) {
          const firstInStock = activeVariants.find((v) => v.stock > 0);
          updates.defaultVariantId = String(firstInStock ? firstInStock._id : activeVariants[0]._id);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        productsNeedingUpdate++;
        if (isVerbose) {
          console.log(`[Pending Update] Product ${product._id} (${product.title}):`, updates);
        }
        if (isApply) {
          await productsColl.updateOne({ _id: product._id }, { $set: updates });
        }
      }
    }

    console.log("=================================================");
    console.log("  Summary Report");
    console.log("=================================================");
    console.log(`  Total Products Scanned : ${totalScanned}`);
    console.log(`  Single Products        : ${singleCount}`);
    console.log(`  Multi Products         : ${multiCount}`);
    console.log(`  Total Variants Found   : ${totalVariants}`);
    console.log(`  Products ${isApply ? "Updated" : "Needing Migration"} : ${productsNeedingUpdate}`);
    console.log("=================================================\n");

    if (warnings.length > 0) {
      console.log("Warnings:");
      warnings.forEach((w) => console.log(`  ${w}`));
      console.log();
    }

    if (!isApply) {
      console.log("ℹ️  Dry run completed. No data was modified.");
      console.log("   To apply changes, execute: node scripts/migrate-product-variants.mjs --apply\n");
    } else {
      console.log("✅ Migration applied successfully.\n");
    }
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("❌ Migration failed with error:", err);
  process.exit(1);
});
